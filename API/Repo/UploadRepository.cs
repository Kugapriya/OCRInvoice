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
        if (string.IsNullOrEmpty(customerId))
            throw new InvalidOperationException("Customer ID is required.");

        if (invoiceTypes == null || invoiceTypes.Count == 0 || invoiceTypes.Count != files.Count)
            throw new InvalidOperationException("Invoice type must be selected for each file before upload.");

        for (int i = 0; i < invoiceTypes.Count; i++)
        {
            if (string.IsNullOrEmpty(invoiceTypes[i]))
                throw new InvalidOperationException($"Invoice type must be selected for file {i + 1}.");
        }

        string _baseRoot = @"E:\Invoice";
        UploadDA ob = new UploadDA(connectionString);

        var savedPaths = new List<string>();

        for (int i = 0; i < files.Count; i++)
        {
            var file = files[i];
            if (file == null || file.Length == 0)
                continue;

            string processType = invoiceTypes[i];

            var invoiceTypeFolder = Path.Combine(_baseRoot, customerId, processType);
            Directory.CreateDirectory(invoiceTypeFolder);

            var timestamp = DateTime.Now.ToString("yyyy_MM_dd_HH_mm_ss_fff", CultureInfo.InvariantCulture);
            var ext = Path.GetExtension(file.FileName) ?? "";
            var fileName = $"{customerId}_{timestamp}{ext}";
            var fullPath = Path.Combine(invoiceTypeFolder, fileName);

            await using (var stream = File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            savedPaths.Add(fullPath);

            await ob.InsertUploadRecordAsync(customerId, string.Empty, fileName, fullPath, processType);
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
                [EndSync],
                [OriginalId]
            FROM DocMate_invoice_headers_Copy
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
                [EndSync],
                [OriginalId]
            FROM DocMate_invoice_line_Data_Copy
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
            EndSync = GetNullableBool(reader, "EndSync"),
            OriginalId = reader.GetInt32(reader.GetOrdinal("OriginalId"))
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
            EndSync = GetNullableBool(reader, "EndSync"),
            OriginalId = reader.GetInt32(reader.GetOrdinal("OriginalId"))
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

    public async Task<List<FileSummaryDto>> GetFileSummariesAsync(string customerId)
    {
        try
        {
            var files = await GetFilesByCustomerAndSupplierAsync(customerId);
            var summaries = new List<FileSummaryDto>();

            foreach (var file in files)
            {
                var dto = new FileSummaryDto();
                try { dto.Id = file.Id; } catch { }
                try { dto.FileName = file.FileName; } catch { }
                try { dto.SupplierName = file.SupplierName; } catch { }
                try { dto.InvoiceNumber = file.InvoiceNumber; } catch { }
                try { dto.InvoiceDate = file.InvoiceDate; } catch { }
                try { dto.UploadedTime = file.UploadedTime; } catch { }
                try { dto.ProcessType = file.ProcessType; } catch { }
                try { dto.IsProcess = file.IsProcess; } catch { }

                if (!string.IsNullOrWhiteSpace(file.InvoiceNumber))
                {
                    var (total, noBarcode) = await GetLineCountsAsync(file.InvoiceNumber, customerId);
                    try { dto.TotalLines = total; } catch { }
                    try { dto.NoBarcodeCount = noBarcode; } catch { }
                }

                summaries.Add(dto);
            }

            return summaries;
        }
        catch (Exception ex)
        {
            throw new Exception("Error fetching file summaries: " + ex.Message, ex);
        }
    }

    private async Task<(int total, int noBarcode)> GetLineCountsAsync(string invoiceNumber, string customerId)
    {
        try
        {
            await using var conn = new SqlConnection(eposV3ConnectionString);
            await conn.OpenAsync();

            const string sql = @"
                SELECT
                    COUNT(*) AS TotalLines,
                    SUM(CASE WHEN [Barcode] IS NULL OR LTRIM(RTRIM([Barcode])) = '' THEN 1 ELSE 0 END) AS NoBarcodeCount
                FROM [DocMate_invoice_line_Data_Copy]
                WHERE [doc_number] = @invoiceNumber AND [cms_customer_id] = @customerId;";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add(new SqlParameter("@invoiceNumber", SqlDbType.NVarChar,64) { Value = invoiceNumber });
            cmd.Parameters.Add(new SqlParameter("@customerId", SqlDbType.NVarChar, 64) { Value = customerId });

            await using var rdr = await cmd.ExecuteReaderAsync();
            if (await rdr.ReadAsync())
            {
                int total = 0;
                int noBarcode = 0;
                try { total = rdr.GetInt32(0); } catch { }
                try { noBarcode = rdr.GetInt32(1); } catch { }
                return (total, noBarcode);
            }

            return (0, 0);
        }
        catch (Exception ex)
        {
            throw new Exception("Error fetching line counts: " + ex.Message, ex);
        }
    }

    public async Task<List<DocMateInvoiceLineDto>> GetLinesByInvoiceNumberAsync(string invoiceNumber, string customerId)
    {
        try
        {
            await using var conn = new SqlConnection(eposV3ConnectionString);
            await conn.OpenAsync();

            const string sql = @"
                SELECT
                    [id], [created_utc], [filename], [doc_type], [supplier_name], [customer_name],
                    [cms_customer_id], [doc_number], [doc_date], [line_no], [code], [description],
                    [case_pack], [unit_size], [total_units], [qty], [unit_price], [line_net],
                    [vat_code], [vat_rate], [vat_amount], [line_gross], [std_rrp], [por],
                    [is_void], [void_note], [pmp], [raw], [Barcode], [UnitCost], [Compared],
                    [Generated], [StartSync], [EndSync], [OriginalId], [IsManual]
                FROM DocMate_invoice_line_Data_Copy
                WHERE [doc_number] = @invoiceNumber AND [cms_customer_id] = @customerId
                ORDER BY [line_no];";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add(new SqlParameter("@invoiceNumber", SqlDbType.NVarChar, 64) { Value = invoiceNumber });
            cmd.Parameters.Add(new SqlParameter("@customerId", SqlDbType.NVarChar, 64) { Value = customerId });

            var rows = new List<DocMateInvoiceLineDto>();
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                var m = new DocMateInvoiceLineDto();
                try { m.Id = rdr.GetInt32(0); } catch { }
                try { m.CreatedUtc = rdr.GetString(1); } catch { }
                try { m.Filename = rdr.GetString(2); } catch { }
                try { m.DocType = rdr.GetString(3); } catch { }
                try { m.SupplierName = rdr.GetString(4); } catch { }
                try { m.CustomerName = rdr.GetString(5); } catch { }
                try { m.CmsCustomerId = rdr.GetString(6); } catch { }
                try { m.DocNumber = rdr.GetString(7); } catch { }
                try { m.DocDate = rdr.GetString(8); } catch { }
                try { m.LineNo = rdr.GetInt32(9); } catch { }
                try { m.Code = rdr.GetString(10); } catch { }
                try { m.Description = rdr.GetString(11); } catch { }
                try { m.CasePack = rdr.IsDBNull(12) ? null : Convert.ToDouble(rdr.GetValue(12)); } catch { }
                try { m.UnitSize = rdr.GetString(13); } catch { }
                try { m.TotalUnits = rdr.IsDBNull(14) ? null : Convert.ToDouble(rdr.GetValue(14)); } catch { }
                try { m.Qty = rdr.IsDBNull(15) ? null : Convert.ToDouble(rdr.GetValue(15)); } catch { }
                try { m.UnitPrice = rdr.IsDBNull(16) ? null : Convert.ToDouble(rdr.GetValue(16)); } catch { }
                try { m.LineNet = rdr.IsDBNull(17) ? null : Convert.ToDouble(rdr.GetValue(17)); } catch { }
                try { m.VatCode = rdr.GetString(18); } catch { }
                try { m.VatRate = rdr.IsDBNull(19) ? null : Convert.ToDouble(rdr.GetValue(19)); } catch { }
                try { m.VatAmount = rdr.IsDBNull(20) ? null : Convert.ToDouble(rdr.GetValue(20)); } catch { }
                try { m.LineGross = rdr.IsDBNull(21) ? null : Convert.ToDouble(rdr.GetValue(21)); } catch { }
                try { m.StdRrp = rdr.IsDBNull(22) ? null : Convert.ToDouble(rdr.GetValue(22)); } catch { }
                try { m.Por = rdr.IsDBNull(23) ? null : Convert.ToDouble(rdr.GetValue(23)); } catch { }
                try { m.IsVoid = rdr.IsDBNull(24) ? null : rdr.GetInt32(24); } catch { }
                try { m.VoidNote = rdr.GetString(25); } catch { }
                try { m.Pmp = rdr.IsDBNull(26) ? null : Convert.ToDouble(rdr.GetValue(26)); } catch { }
                try { m.Raw = rdr.GetString(27); } catch { }
                try { m.Barcode = rdr.IsDBNull(28) ? null : rdr.GetString(28); } catch { }
                try { m.UnitCost = rdr.IsDBNull(29) ? null : rdr.GetDecimal(29); } catch { }
                try { m.Compared = rdr.IsDBNull(30) ? null : rdr.GetBoolean(30); } catch { }
                try { m.Generated = rdr.IsDBNull(31) ? null : rdr.GetBoolean(31); } catch { }
                try { m.StartSync = rdr.IsDBNull(32) ? null : rdr.GetBoolean(32); } catch { }
                try { m.EndSync = rdr.IsDBNull(33) ? null : rdr.GetBoolean(33); } catch { }
                try { m.OriginalId = rdr.GetInt32(34); } catch { }
                try { m.IsManual = rdr.IsDBNull(35) ? null : rdr.GetBoolean(35); } catch { }
                rows.Add(m);
            }

            return rows;
        }
        catch (Exception ex)
        {
            throw new Exception("Error fetching invoice lines: " + ex.Message, ex);
        }
    }

    public async Task<bool> UpdateLineBarcodeAsync(int lineId, string? barcode)
    {
        await using var conn = new SqlConnection(eposV3ConnectionString);
        await conn.OpenAsync();

        const string sql = @"
            UPDATE DocMate_invoice_line_Data_Copy
            SET [Barcode] = @barcode,
                [IsManual] = 1
            WHERE [id] = @lineId;";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.Add(new SqlParameter("@lineId", SqlDbType.Int) { Value = lineId });
        cmd.Parameters.Add(new SqlParameter("@barcode", SqlDbType.NVarChar, 20) { Value = barcode ?? (object)DBNull.Value });

        var rowsAffected = await cmd.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }

    public async Task<List<DocMateInvoiceLineDto>> GetInvoiceLinesAsync(int lineIdStart, int lineIdEnd)
    {
        return await ReadLinesAsync(lineIdStart, lineIdEnd);
    }
}