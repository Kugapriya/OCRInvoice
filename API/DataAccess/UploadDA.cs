using System.Data;
using System.Data.SqlClient;
using API.Models;

namespace API
{
    public class UploadDA
    {
        private string connectionString;
        public UploadDA(string ConnStr)
        {
            connectionString = ConnStr;
        }

        public async Task<int> InsertUploadRecordAsync(string customerId, string supplierName, string fileName, string filePath, string processType)
        {
            const string sql = @"
                INSERT INTO UploadedFiles
                    ([CustomerId], [SupplierName], [FileName], [FilePath], [ProcessType], [UploadedTime],[IsProcess])
                VALUES
                    (@customerId, @supplierName, @fileName, @filePath, @processType, @uploadedTime,@IsProcess);
                ";

            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync();

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add(new SqlParameter("@customerId", SqlDbType.NVarChar, 100) { Value = customerId });
            cmd.Parameters.Add(new SqlParameter("@supplierName", SqlDbType.NVarChar, 255) { Value = supplierName });
            cmd.Parameters.Add(new SqlParameter("@fileName", SqlDbType.NVarChar, -1) { Value = fileName });
            cmd.Parameters.Add(new SqlParameter("@filePath", SqlDbType.NVarChar, -1) { Value = filePath });
            cmd.Parameters.Add(new SqlParameter("@processType", SqlDbType.NVarChar, 100) { Value = processType });
            cmd.Parameters.Add(new SqlParameter("@uploadedTime", SqlDbType.DateTime2) { Value = DateTime.Now });
            cmd.Parameters.Add(new SqlParameter("@IsProcess", SqlDbType.Bit) { Value = 0 });

            return await cmd.ExecuteNonQueryAsync();
        }
        public async Task<List<UploadedFiles>> GetFilesByCustomerAndSupplierAsync(string customerId)
        {
            var files = new List<UploadedFiles>();

            const string sql = @"
                    SELECT Id, CustomerId, SupplierName, FileName, FilePath, 
                        ProcessType, UploadedTime, IsProcess
                    FROM UploadedFiles
                    WHERE CustomerId = @customerId
                    ORDER BY UploadedTime DESC; ";

            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync();

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add(new SqlParameter("@customerId", SqlDbType.NVarChar, 100) { Value = customerId });
            // cmd.Parameters.Add(new SqlParameter("@supplierName", SqlDbType.NVarChar, 255) { Value = supplierName });

            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                files.Add(new UploadedFiles
                {
                    Id = reader.GetInt32(0),
                    CustomerId = reader.GetString(1),
                    SupplierName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    FileName = reader.GetString(3),
                    FilePath = reader.IsDBNull(4) ? null : reader.GetString(4),
                    ProcessType = reader.IsDBNull(5) ? null : reader.GetString(5),
                    UploadedTime = reader.GetDateTime(6),
                    IsProcess = reader.GetBoolean(7)
                });
            }
            return files;
        }
    }
}