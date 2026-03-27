using System.Data.SqlClient;
using API.Dtos;

namespace API
{
    public class StoresDA
    {
        private string connectionString;
        public StoresDA(string ConnStr)
        {
            connectionString = ConnStr;
        }
        public async Task<List<StoreDto>> GetStoresByUsername(string username)
        {
            var stores = new List<StoreDto>();

            await using (SqlConnection conn = new SqlConnection(connectionString))
            {
                await conn.OpenAsync();

                string sql = @"
            SELECT s.StoreId, s.StoreName, s.CustomerId, s.DealerId, s.IsBlocked
            FROM Stores s
            INNER JOIN AssignedStores a ON a.StoreId = s.StoreId
            WHERE a.Username = @Username AND s.IsBlocked = 0";

                await using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@Username", username);

                    await using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            stores.Add(new StoreDto
                            {
                                StoreId = reader["StoreId"].ToString() ?? "",
                                StoreName = reader["StoreName"].ToString() ?? "",
                                CustomerId = reader["CustomerId"].ToString() ?? "",
                                DealerId = reader["DealerId"].ToString() ?? ""
                            });
                        }
                    }
                }
            }

            return stores;
        }

        // public DataRow GetUser(string username)
        // {
        //     using (SqlConnection conn = new SqlConnection(connectionString))
        //     {
        //         conn.Open();
        //         using (SqlCommand cmd = new SqlCommand(
        //             "SELECT Username, AccessLevel, IsSuperUser, CustomerId, DealerId FROM Users WHERE Username=@Username", conn))
        //         {
        //             cmd.Parameters.AddWithValue("@Username", username);
        //             using (SqlDataAdapter da = new SqlDataAdapter(cmd))
        //             {
        //                 DataTable dt = new DataTable();
        //                 da.Fill(dt);
        //                 return dt.Rows.Count > 0 ? dt.Rows[0] : null;
        //             }
        //         }
        //     }
        // }
    }
}