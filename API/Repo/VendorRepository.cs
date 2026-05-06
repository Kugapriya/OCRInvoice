using API.DataAccess;
using API.Models;

namespace API.Repo
{
    public class VendorRepository
    {
        public readonly IConfiguration _config;
        private readonly string connectionString;

        public VendorRepository(IConfiguration config)
        {
            _config = config;
            connectionString = config.GetConnectionString("DefaultConnection")
                        ?? throw new InvalidOperationException("Connection string not configured.");
        }

        public async Task<List<Vendor>> GetAllVendorsAsync()
        {
            VendorDA da = new VendorDA(connectionString);
            return await da.GetAllVendorsAsync();
        }

        public async Task<Vendor?> GetVendorByIdAsync(int id)
        {
            VendorDA da = new VendorDA(connectionString);
            return await da.GetVendorByIdAsync(id);
        }

        public async Task<bool> VendorExistsAsync(string supplierName, int? excludeId = null)
        {
            VendorDA da = new VendorDA(connectionString);
            return await da.VendorExistsAsync(supplierName, excludeId);
        }

        public async Task<int> CreateVendorAsync(Vendor vendor)
        {
            VendorDA da = new VendorDA(connectionString);
            return await da.CreateVendorAsync(vendor);
        }

        public async Task<bool> UpdateVendorAsync(Vendor vendor)
        {
            VendorDA da = new VendorDA(connectionString);
            return await da.UpdateVendorAsync(vendor);
        }

        public async Task<bool> DeleteVendorAsync(int id)
        {
            VendorDA da = new VendorDA(connectionString);
            return await da.DeleteVendorAsync(id);
        }
    }
}
