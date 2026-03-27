using System.Data;
using System.Data.SqlClient;
using API.Dtos;

namespace API
{
    public class CustomerDA
    {
        private string connectionString;
        public CustomerDA(string ConnStr)
        {
            connectionString = ConnStr;
        }

        public async Task<EmailSetup> GetEmailList()
        {
            EmailSetup m = new EmailSetup();

            string SQL = @"SELECT TOP 1 [Id],[Username],[Password],[SmtpServer],
                    [Port],[EnableSsl]
                    FROM EmailSetups";
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                await conn.OpenAsync();
                using (SqlCommand cmd = new SqlCommand(SQL, conn))
                {
                    using (SqlDataReader rdr = await cmd.ExecuteReaderAsync())
                    {
                        while (await rdr.ReadAsync())
                        {
                            try { m.Id = rdr.GetInt32(0); } catch { }
                            try { m.Username = rdr.GetString(1); } catch { }
                            try { m.Password = rdr.GetString(2); } catch { }
                            try { m.SmtpServer = rdr.GetString(3); } catch { }
                            try { m.Port = rdr.GetInt32(4); } catch { }
                            try { m.EnableSsl = rdr.GetBoolean(5); } catch { }
                        }
                    }
                }
            }
            return m;
        }

        public async Task<LoginResponseDto?> Login(UserForLoginDto user)
        {
            await using SqlConnection conn = new SqlConnection(connectionString);
            await conn.OpenAsync();

            string query = @"SELECT  Top 1 Username,CustomerId,DealerId,StoreId,Name,Email,GoogleUrl,AzureUrl,[Role]
                         FROM Customers
                         WHERE Username=@Username AND Password=@Password";

            using SqlCommand cmd = new SqlCommand(query, conn);

            cmd.Parameters.Add("@Username", SqlDbType.NVarChar).Value = user.Username;
            cmd.Parameters.Add("@Password", SqlDbType.NVarChar).Value = user.Password;

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new LoginResponseDto
                {
                    Username = reader.IsDBNull(0) ? "" : reader.GetString(0),
                    CustomerId = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    DealerId = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    StoreId = reader.IsDBNull(3) ? "" : reader.GetString(3),
                    Name = reader.IsDBNull(4) ? "" : reader.GetString(4),
                    Email = reader.IsDBNull(5) ? "" : reader.GetString(5),
                    GoogleUrl = reader.IsDBNull(6) ? "" : reader.GetString(6),
                    AzureUrl = reader.IsDBNull(7) ? "" : reader.GetString(7),
                    Role = reader.IsDBNull(8) ? "" : reader.GetString(8)
                };
            }

            return null;
        }
        public async Task<Customer?> GetCustomerByStore(string username, string storeId)
        {
            Customer? customer = null;

            string query = @"SELECT TOP 1 
                        Username, CustomerId, DealerId, StoreId,
                        Name, Email, GoogleUrl, AzureUrl, Role
                     FROM Customers
                     WHERE Username = @Username AND StoreId = @StoreId";

            using (SqlConnection con = new SqlConnection(connectionString))
            using (SqlCommand cmd = new SqlCommand(query, con))
            {
                cmd.Parameters.AddWithValue("@Username", username);
                cmd.Parameters.AddWithValue("@StoreId", storeId);

                await con.OpenAsync();

                using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        customer = new Customer
                        {
                            Username = reader["Username"]?.ToString() ?? "",
                            CustomerId = reader["CustomerId"]?.ToString() ?? "",
                            DealerId = reader["DealerId"]?.ToString() ?? "",
                            StoreId = reader["StoreId"]?.ToString() ?? "",
                            Name = reader["Name"]?.ToString() ?? "",
                            Email = reader["Email"]?.ToString() ?? "",
                            GoogleUrl = reader["GoogleUrl"]?.ToString() ?? "",
                            AzureUrl = reader["AzureUrl"]?.ToString() ?? "",
                            Role = reader["Role"]?.ToString() ?? ""
                        };
                    }
                }
            }
            return customer;
        }
    }
}