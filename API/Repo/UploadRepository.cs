using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using API;
using API.Dtos;
using API.Models;

public class UploadRepository
{
    private readonly string connectionString;
    private readonly string eposV3ConnectionString;
    private readonly IConfiguration _config;

    public UploadRepository(IConfiguration config)
    {
        _config = config;
        connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection string not configured.");
        eposV3ConnectionString = config.GetConnectionString("EposV3Connectionstring")
            ?? throw new InvalidOperationException("EposV3Connectionstring not configured.");
    }

    public async Task<List<string>> UploadFilesAsync(List<IFormFile> files, string customerId, List<string> vendors, List<string> invoiceTypes)
    {
        // Validate that customerId is provided
        if (string.IsNullOrEmpty(customerId))
        {
            throw new InvalidOperationException("Customer ID is required.");
        }

        // Validate that vendors are provided and match file count
        if (vendors == null || vendors.Count == 0 || vendors.Count != files.Count)
        {
            throw new InvalidOperationException("Supplier/Vendor must be selected for each file before upload.");
        }

        // Validate that all vendors are selected (not empty)
        for (int i = 0; i < vendors.Count; i++)
        {
            if (string.IsNullOrEmpty(vendors[i]))
            {
                throw new InvalidOperationException($"Supplier/Vendor must be selected for file {i + 1}.");
            }
        }

        // Validate that invoiceTypes are provided and match file count
        if (invoiceTypes == null || invoiceTypes.Count == 0 || invoiceTypes.Count != files.Count)
        {
            throw new InvalidOperationException("Invoice type must be selected for each file before upload.");
        }

        // Validate that all invoiceTypes are selected (not empty)
        for (int i = 0; i < invoiceTypes.Count; i++)
        {
            if (string.IsNullOrEmpty(invoiceTypes[i]))
            {
                throw new InvalidOperationException($"Invoice type must be selected for file {i + 1}.");
            }
        }

        string _baseRoot = @"E:\Invoice";
        UploadDA ob = new UploadDA(connectionString);

        var savedPaths = new List<string>();

        for (int i = 0; i < files.Count; i++)
        {
            var file = files[i];
            if (file == null || file.Length == 0)
                continue;

            // Use the selected vendor and invoice type for this file (already validated above)
            string supplierName = vendors[i].ToUpper();
            string processType = invoiceTypes[i].ToUpper();

            var customerFolder = Path.Combine(_baseRoot, customerId);
            var supplierFolder = Path.Combine(customerFolder, supplierName);
            var processTypeFolder = Path.Combine(supplierFolder, processType);
            Directory.CreateDirectory(processTypeFolder);

            var timestamp = DateTime.Now.ToString("yyyy_MM_dd_HH_mm_ss_fff", CultureInfo.InvariantCulture);
            var ext = Path.GetExtension(file.FileName) ?? "";
            var fileName = $"{customerId}_{timestamp}_{supplierName}{ext}";
            var fullPath = Path.Combine(processTypeFolder, fileName);

            await using (var stream = File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            savedPaths.Add(fullPath);

            await ob.InsertUploadRecordAsync(customerId, supplierName, fileName, fullPath, processType);
        }

        return savedPaths;
    }

    public async Task<List<UploadedFiles>> GetFilesByCustomerAndSupplierAsync(string customerId)
    {
        UploadDA ob = new UploadDA(connectionString);
        return await ob.GetFilesByCustomerAndSupplierAsync(customerId);
    }

    public async Task<List<InvoiceFileDetailDto>> GetUploadedFileDetailsAsync(string customerId)
    {
        var files = await GetFilesByCustomerAndSupplierAsync(customerId);
        var details = new List<InvoiceFileDetailDto>();

        foreach (var file in files)
        {
            DocMateInvoiceHeaderDto? header = null;
            var lines = new List<DocMateInvoiceLineDto>();

            if (file.HeaderId > 0)
            {
                header = await ReadHeaderAsync(file.HeaderId);
            }

            if (file.LineIdStart > 0 && file.LineIdEnd > 0)
            {
                var lineStart = file.LineIdStart;
                var lineEnd = file.LineIdEnd;

                lines = await ReadLinesAsync(lineStart, lineEnd);
            }

            details.Add(new InvoiceFileDetailDto
            {
                UploadedFile = file,
                Header = header,
                Lines = lines
            });
        }

        return details;
    }

    private async Task<DocMateInvoiceHeaderDto?> ReadHeaderAsync(int headerId)
    {
        await using var conn = new SqlConnection(eposV3ConnectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT 
                [id],
                [created_utc],
                [filename],
                [doc_type],
                [supplier_name],
                [customer_name],
                [cms_customer_id],
                [doc_number],
                [doc_date],
                [total_ex_vat],
                [total_vat],
                [total_inc_vat],
                [currency],
                [Compared],
                [Generated],
                [StartSync],
                [EndSync]
            FROM [dbo].[DocMate_invoice_headers]
            WHERE [id] = @headerId;";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.Add(new SqlParameter("@headerId", SqlDbType.Int) { Value = headerId });

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapHeader(reader);
    }

    private async Task<List<DocMateInvoiceLineDto>> ReadLinesAsync(int lineStart, int lineEnd)
    {
        await using var conn = new SqlConnection(eposV3ConnectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                [id],
                [created_utc],
                [filename],
                [doc_type],
                [supplier_name],
                [customer_name],
                [cms_customer_id],
                [doc_number],
                [doc_date],
                [line_no],
                [code],
                [description],
                [case_pack],
                [unit_size],
                [total_units],
                [qty],
                [unit_price],
                [line_net],
                [vat_code],
                [vat_rate],
                [vat_amount],
                [line_gross],
                [std_rrp],
                [por],
                [is_void],
                [void_note],
                [pmp],
                [raw],
                [Barcode],
                [UnitCost],
                [Compared],
                [Generated],
                [StartSync],
                [EndSync]
            FROM [dbo].[DocMate_invoice_line_Data]
            WHERE [id] BETWEEN @lineStart AND @lineEnd
            ORDER BY [id];";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.Add(new SqlParameter("@lineStart", SqlDbType.Int) { Value = lineStart });
        cmd.Parameters.Add(new SqlParameter("@lineEnd", SqlDbType.Int) { Value = lineEnd });

        var rows = new List<DocMateInvoiceLineDto>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(MapLine(reader));
        }

        return rows;
    }

    private static DocMateInvoiceHeaderDto MapHeader(SqlDataReader reader)
    {
        return new DocMateInvoiceHeaderDto
        {
            Id = reader.GetInt32(reader.GetOrdinal("id")),
            CreatedUtc = GetString(reader, "created_utc") ?? string.Empty,
            Filename = GetString(reader, "filename"),
            DocType = GetString(reader, "doc_type"),
            SupplierName = GetString(reader, "supplier_name"),
            CustomerName = GetString(reader, "customer_name"),
            CmsCustomerId = GetString(reader, "cms_customer_id"),
            DocNumber = GetString(reader, "doc_number"),
            DocDate = GetString(reader, "doc_date"),
            TotalExVat = GetNullableDouble(reader, "total_ex_vat"),
            TotalVat = GetNullableDouble(reader, "total_vat"),
            TotalIncVat = GetNullableDouble(reader, "total_inc_vat"),
            Currency = GetString(reader, "currency"),
            Compared = GetNullableBool(reader, "Compared"),
            Generated = GetNullableBool(reader, "Generated"),
            StartSync = GetNullableBool(reader, "StartSync"),
            EndSync = GetNullableBool(reader, "EndSync")
        };
    }

    private static DocMateInvoiceLineDto MapLine(SqlDataReader reader)
    {
        return new DocMateInvoiceLineDto
        {
            Id = reader.GetInt32(reader.GetOrdinal("id")),
            CreatedUtc = GetString(reader, "created_utc") ?? string.Empty,
            Filename = GetString(reader, "filename"),
            DocType = GetString(reader, "doc_type"),
            SupplierName = GetString(reader, "supplier_name"),
            CustomerName = GetString(reader, "customer_name"),
            CmsCustomerId = GetString(reader, "cms_customer_id"),
            DocNumber = GetString(reader, "doc_number"),
            DocDate = GetString(reader, "doc_date"),
            LineNo = GetNullableInt32(reader, "line_no"),
            Code = GetString(reader, "code"),
            Description = GetString(reader, "description"),
            CasePack = GetNullableDouble(reader, "case_pack"),
            UnitSize = GetString(reader, "unit_size"),
            TotalUnits = GetNullableDouble(reader, "total_units"),
            Qty = GetNullableDouble(reader, "qty"),
            UnitPrice = GetNullableDouble(reader, "unit_price"),
            LineNet = GetNullableDouble(reader, "line_net"),
            VatCode = GetString(reader, "vat_code"),
            VatRate = GetNullableDouble(reader, "vat_rate"),
            VatAmount = GetNullableDouble(reader, "vat_amount"),
            LineGross = GetNullableDouble(reader, "line_gross"),
            StdRrp = GetNullableDouble(reader, "std_rrp"),
            Por = GetNullableDouble(reader, "por"),
            IsVoid = GetNullableInt32(reader, "is_void"),
            VoidNote = GetString(reader, "void_note"),
            Pmp = GetNullableDouble(reader, "pmp"),
            Raw = GetString(reader, "raw"),
            Barcode = GetString(reader, "Barcode"),
            UnitCost = GetNullableDecimal(reader, "UnitCost"),
            Compared = GetNullableBool(reader, "Compared"),
            Generated = GetNullableBool(reader, "Generated"),
            StartSync = GetNullableBool(reader, "StartSync"),
            EndSync = GetNullableBool(reader, "EndSync")
        };
    }

    private static string? GetString(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static int? GetNullableInt32(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
    }

    private static double? GetNullableDouble(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : Convert.ToDouble(reader.GetValue(ordinal));
    }

    private static decimal? GetNullableDecimal(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetDecimal(ordinal);
    }

    private static bool? GetNullableBool(SqlDataReader reader, string name)
    {
        var ordinal = reader.GetOrdinal(name);
        return reader.IsDBNull(ordinal) ? null : reader.GetBoolean(ordinal);
    }

    public async Task<bool> UpdateLineBarcodeAsync(int lineId, string? barcode)
    {
        await using var conn = new SqlConnection(eposV3ConnectionString);
        await conn.OpenAsync();

        const string sql = @"
            UPDATE [dbo].[DocMate_invoice_line_Data]
            SET [Barcode] = @barcode
            WHERE [id] = @lineId;";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.Add(new SqlParameter("@lineId", SqlDbType.Int) { Value = lineId });
        cmd.Parameters.Add(new SqlParameter("@barcode", SqlDbType.NVarChar, 255) { Value = barcode ?? (object)DBNull.Value });

        var rowsAffected = await cmd.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<List<DocMateInvoiceLineDto>> GetInvoiceLinesAsync(int lineIdStart, int lineIdEnd)
    {
        return await ReadLinesAsync(lineIdStart, lineIdEnd);
    }
}