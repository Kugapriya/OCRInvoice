using System.Data;
using System.Data.SqlClient;

namespace API
{
    public class UploadDA
    {
        private string connectionString;
        public UploadDA(string ConnStr)
        {
            connectionString = ConnStr;
        }

        public async Task<int> InsertUploadRecordAsync(string customerId, string supplierName, string fileName, string filePath,string processType)
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
    }
}