using API.Models;
using System.Data;
using System.Data.SqlClient;

namespace API.DataAccess
{
    public class VendorDA
    {
        private readonly string _connectionString;

        public VendorDA(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<List<Vendor>> GetAllVendorsAsync()
        {
            List<Vendor> vendors = new List<Vendor>();

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();
                string query = "SELECT ID, SupplierName, ContactName, Address1, City, MobileNumber, Email FROM Vendors ";

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    using (SqlDataReader reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            vendors.Add(new Vendor
                            {
                                ID = reader.GetInt32(0),
                                SupplierName = reader.GetString(1),
                                ContactName = reader.IsDBNull(2) ? null : reader.GetString(2),
                                Address1 = reader.IsDBNull(3) ? null : reader.GetString(3),
                                City = reader.IsDBNull(4) ? null : reader.GetString(4),
                                MobileNumber = reader.IsDBNull(5) ? null : reader.GetString(5),
                                Email = reader.IsDBNull(6) ? null : reader.GetString(6)
                            });
                        }
                    }
                }
            }

            return vendors;
        }

        public async Task<Vendor?> GetVendorByIdAsync(int id)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();
                string query = "SELECT ID, SupplierName, ContactName, Address1, City, MobileNumber, Email FROM Vendors WHERE ID = @ID";

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@ID", id);

                    using (SqlDataReader reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new Vendor
                            {
                                ID = reader.GetInt32(0),
                                SupplierName = reader.GetString(1),
                                ContactName = reader.IsDBNull(2) ? null : reader.GetString(2),
                                Address1 = reader.IsDBNull(3) ? null : reader.GetString(3),
                                City = reader.IsDBNull(4) ? null : reader.GetString(4),
                                MobileNumber = reader.IsDBNull(5) ? null : reader.GetString(5),
                                Email = reader.IsDBNull(6) ? null : reader.GetString(6)
                            };
                        }
                    }
                }
            }

            return null;
        }

        // public async Task<bool> VendorExistsAsync(string supplierName, int? excludeId = null)
        // {
        //     using (SqlConnection connection = new SqlConnection(_connectionString))
        //     {
        //         await connection.OpenAsync();
        //         string query = "SELECT COUNT(*) FROM Vendors WHERE UPPER(SupplierName) = UPPER(@SupplierName)";
        //         if (excludeId.HasValue)
        //         {
        //             query += " AND ID != @ExcludeId";
        //         }

        //         using (SqlCommand command = new SqlCommand(query, connection))
        //         {
        //             command.Parameters.AddWithValue("@SupplierName", supplierName);
        //             if (excludeId.HasValue)
        //             {
        //                 command.Parameters.AddWithValue("@ExcludeId", excludeId.Value);
        //             }

        //             int count = (int)await command.ExecuteScalarAsync();
        //             return count > 0;
        //         }
        //     }
        // }

        public async Task<int> CreateVendorAsync(Vendor m)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                string query = @"INSERT INTO Vendors (SupplierName, ContactName, Address1, City, MobileNumber, Email)
                                VALUES (@SupplierName, @ContactName, @Address1, @City, @MobileNumber, @Email)";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.Add(new SqlParameter("@SupplierName", SqlDbType.NVarChar, 255) { Value = m.SupplierName });
                    cmd.Parameters.Add(new SqlParameter("@ContactName", SqlDbType.NVarChar, 255) { Value = (object?)m.ContactName ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@Address1", SqlDbType.NVarChar, 500) { Value = (object?)m.Address1 ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@City", SqlDbType.NVarChar, 100) { Value = (object?)m.City ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@MobileNumber", SqlDbType.NVarChar, 50) { Value = (object?)m.MobileNumber ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@Email", SqlDbType.NVarChar, 255) { Value = (object?)m.Email ?? DBNull.Value });

                    return await cmd.ExecuteNonQueryAsync();
                }
            }
        }

        public async Task<bool> UpdateVendorAsync(Vendor m)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                string Sql = @"UPDATE Vendors 
                                SET SupplierName = @SupplierName,
                                    ContactName = @ContactName,
                                    Address1 = @Address1,
                                    City = @City,
                                    MobileNumber = @MobileNumber,
                                    Email = @Email
                                WHERE ID = @ID ";

                using (SqlCommand cmd = new SqlCommand(Sql, conn))
                {
                    cmd.Parameters.Add(new SqlParameter("@ID", SqlDbType.Int) { Value = m.ID });
                    cmd.Parameters.Add(new SqlParameter("@SupplierName", SqlDbType.NVarChar, 255) { Value = m.SupplierName });
                    cmd.Parameters.Add(new SqlParameter("@ContactName", SqlDbType.NVarChar, 255) { Value = (object?)m.ContactName ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@Address1", SqlDbType.NVarChar, 500) { Value = (object?)m.Address1 ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@City", SqlDbType.NVarChar, 100) { Value = (object?)m.City ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@MobileNumber", SqlDbType.NVarChar, 50) { Value = (object?)m.MobileNumber ?? DBNull.Value });
                    cmd.Parameters.Add(new SqlParameter("@Email", SqlDbType.NVarChar, 255) { Value = (object?)m.Email ?? DBNull.Value });

                    int rowsAffected = await cmd.ExecuteNonQueryAsync();
                    return rowsAffected > 0;
                }
            }
        }

        public async Task<bool> DeleteVendorAsync(int id)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();
                string query = "DELETE FROM Vendors WHERE ID = @ID";

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@ID", id);
                    int rowsAffected = await command.ExecuteNonQueryAsync();
                    return rowsAffected > 0;
                }
            }
        }
    }
}

