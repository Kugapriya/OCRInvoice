using API.DataAccess;
using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Repo
{
    public class AuthRepository
    {
        public readonly IConfiguration _config;
        public DataContext _context;
        private readonly string connectionString;

        public AuthRepository(IConfiguration config, DataContext context)
        {
            _config = config;
            _context = context;
            connectionString = config.GetConnectionString("DefaultConnection")
                        ?? throw new InvalidOperationException("Connection string not configured.");
        }

        public async Task<User?> Login(string uname, string pwd)
        {
            if (string.IsNullOrWhiteSpace(uname) || string.IsNullOrWhiteSpace(pwd))
                return null;

            uname = uname.Trim().ToLower();
            var user = await _context.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == uname);
            if (user == null)
                return null;

            if (string.IsNullOrEmpty(user.Password))
                return null;
            if (user.Password.Trim() != pwd.Trim())
                return null;

            return user;
        }

        public async Task<User?> FindUserByUsernameAsync(string username)
        {
            return await _context.Users.FirstOrDefaultAsync(x => x.Username == username);
        }

        public async Task<User?> FindUserByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(x => x.Email == email);
        }

        public async Task<bool> UpdatePasswordAsync(string username, string newPassword)
        {
            var user = await FindUserByUsernameAsync(username);
            if (user == null) return false;

            user.Password = newPassword;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}