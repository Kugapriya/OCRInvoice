using System.Data.SqlClient;

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
    }
}