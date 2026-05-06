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
                string query = "SELECT ID, SupplierName, ContactName, Address1, City, MobileNumber, Email FROM Vendors ORDER BY SupplierName";

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

        public async Task<bool> VendorExistsAsync(string supplierName, int? excludeId = null)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();
                string query = "SELECT COUNT(*) FROM Vendors WHERE UPPER(SupplierName) = UPPER(@SupplierName)";
                if (excludeId.HasValue)
                {
                    query += " AND ID != @ExcludeId";
                }

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@SupplierName", supplierName);
                    if (excludeId.HasValue)
                    {
                        command.Parameters.AddWithValue("@ExcludeId", excludeId.Value);
                    }

                    int count = (int)await command.ExecuteScalarAsync();
                    return count > 0;
                }
            }
        }

        public async Task<int> CreateVendorAsync(Vendor vendor)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();
                string query = @"INSERT INTO Vendors (SupplierName, ContactName, Address1, City, MobileNumber, Email) 
                                VALUES (@SupplierName, @ContactName, @Address1, @City, @MobileNumber, @Email);
                                SELECT SCOPE_IDENTITY();";

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@SupplierName", vendor.SupplierName);
                    command.Parameters.AddWithValue("@ContactName", vendor.ContactName ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Address1", vendor.Address1 ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@City", vendor.City ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@MobileNumber", vendor.MobileNumber ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Email", vendor.Email ?? (object)DBNull.Value);

                    var result = await command.ExecuteScalarAsync();
                    return result != null ? Convert.ToInt32(result) : 0;
                }
            }
        }

        public async Task<bool> UpdateVendorAsync(Vendor vendor)
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                await connection.OpenAsync();
                string query = @"UPDATE Vendors 
                                SET SupplierName = @SupplierName,
                                    ContactName = @ContactName,
                                    Address1 = @Address1,
                                    City = @City,
                                    MobileNumber = @MobileNumber,
                                    Email = @Email
                                WHERE ID = @ID";

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@ID", vendor.ID);
                    command.Parameters.AddWithValue("@SupplierName", vendor.SupplierName);
                    command.Parameters.AddWithValue("@ContactName", vendor.ContactName ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Address1", vendor.Address1 ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@City", vendor.City ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@MobileNumber", vendor.MobileNumber ?? (object)DBNull.Value);
                    command.Parameters.AddWithValue("@Email", vendor.Email ?? (object)DBNull.Value);

                    int rowsAffected = await command.ExecuteNonQueryAsync();
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

