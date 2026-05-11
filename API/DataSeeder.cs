using API.DataAccess;
using API.Models;

namespace API
{
    public static class DataSeeder
    {
        public static void SeedAdmin(IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<DataContext>();

            if (context.Users.Find("docmate@visualbusinessretail.com") != null) return;

            context.Users.Add(new User
            {
                Username = "docmate@visualbusinessretail.com",
                Password = BCrypt.Net.BCrypt.HashPassword("Vbr#DocMat3!"),
                Name = "Administrator",
                Role = "Admin",
                IsSuperUser = true,
                Email = "docmate@visualbusinessretail.com"
            });

            context.SaveChanges();
        }
    }
}
