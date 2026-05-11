using System.Collections.Concurrent;
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

        private static readonly ConcurrentDictionary<string, (string Code, DateTime Expiry)> _otpStore = new();

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
            var user = await _context.Users.FirstOrDefaultAsync(x =>
                x.Username.ToLower() == uname ||
                (x.Email != null && x.Email.ToLower() == uname));
            if (user == null || string.IsNullOrEmpty(user.Password))
                return null;

            var password = pwd.Trim();

            // BCrypt hash always starts with $2 — otherwise it's a plain-text password from the other portal
            bool valid;
            if (user.Password.StartsWith("$2"))
            {
                valid = BCrypt.Net.BCrypt.Verify(password, user.Password);
            }
            else
            {
                // Plain-text match (legacy users from other portal)
                valid = user.Password.Trim() == password;
                if (valid)
                {
                    // Auto-upgrade to BCrypt on first successful login
                    user.Password = BCrypt.Net.BCrypt.HashPassword(password);
                    _context.Users.Update(user);
                    await _context.SaveChangesAsync();
                }
            }

            return valid ? user : null;
        }

        public async Task<User?> FindUserByUsernameAsync(string username)
        {
            return await _context.Users.FirstOrDefaultAsync(x => x.Username == username);
        }

        public async Task<User?> FindUserByEmailAsync(string email)
        {
            var lower = email.Trim().ToLower();
            return await _context.Users.FirstOrDefaultAsync(x => x.Email != null && x.Email.ToLower() == lower);
        }

        public async Task<bool> UpdatePasswordAsync(string username, string newPassword)
        {
            var user = await FindUserByUsernameAsync(username);
            if (user == null) return false;

            user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return true;
        }

        public string GenerateAndStoreOtp(string email)
        {
            var otp = Random.Shared.Next(100000, 1000000).ToString("D6");
            _otpStore[email.ToLower()] = (otp, DateTime.UtcNow.AddMinutes(10));
            return otp;
        }

        public bool VerifyOtp(string email, string otp)
        {
            var key = email.ToLower();
            if (!_otpStore.TryGetValue(key, out var stored)) return false;
            if (DateTime.UtcNow > stored.Expiry) { _otpStore.TryRemove(key, out _); return false; }
            if (stored.Code != otp.Trim()) return false;
            _otpStore.TryRemove(key, out _);
            return true;
        }
    }
}