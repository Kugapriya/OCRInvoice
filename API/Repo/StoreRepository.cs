using API.DataAccess;
using API.Dtos;
using Microsoft.EntityFrameworkCore;

namespace API.Repo
{
    public class StoreRepository
    {
        public readonly IConfiguration _config;
        public DataContext _context;
        private readonly string connectionString;

        public StoreRepository(IConfiguration config, DataContext context)
        {
            _config = config;
            _context = context;
            connectionString = config.GetConnectionString("DefaultConnection")
                        ?? throw new InvalidOperationException("Connection string not configured.");
        }
        public async Task<List<StoreDto>> GetStoresForUserAsync(string username)
        {
            StoresDA ob = new StoresDA(connectionString);
            var stores = await ob.GetStoresByUsername(username);
            return stores;
        }

        public async Task<Customer?> GetCustomerByStore(string username,string StoreId)
        {
            CustomerDA ob = new CustomerDA(connectionString);
            return await ob.GetCustomerByStore(username,StoreId);
        }
    }
}