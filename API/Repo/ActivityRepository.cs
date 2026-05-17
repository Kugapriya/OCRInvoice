using API.DataAccess;
using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Repo
{
    public class ActivityRepository
    {
        private readonly DataContext _context;

        public ActivityRepository(DataContext context)
        {
            _context = context;
        }

        public async Task LogActivityAsync(string username, string activityType, string? detail = null, string? customerId = null, string? ip = null)
        {
            _context.UserActivityLogs.Add(new UserActivityLog
            {
                Username = username,
                ActivityType = activityType,
                ActivityDetail = detail,
                CustomerId = customerId,
                IpAddress = ip,
                CreatedAt = DateTime.Now
            });
            await _context.SaveChangesAsync();
        }

        public async Task StartSessionAsync(string username, string sessionId, string? ip = null)
        {
            _context.UserSessions.Add(new UserSession
            {
                Username = username,
                SessionId = sessionId,
                LoginAt = DateTime.Now,
                LastHeartbeat = DateTime.Now,
                IpAddress = ip
            });
            await _context.SaveChangesAsync();
        }

        public async Task EndSessionAsync(string username, string? ip = null)
        {
            var session = await _context.UserSessions
                .Where(s => s.Username == username && s.LogoutAt == null)
                .OrderByDescending(s => s.LoginAt)
                .FirstOrDefaultAsync();

            if (session != null)
            {
                session.LogoutAt = DateTime.Now;
                await _context.SaveChangesAsync();
            }

            await LogActivityAsync(username, "logout", null, null, ip);
        }

        public async Task UpdateHeartbeatAsync(string username)
        {
            var session = await _context.UserSessions
                .Where(s => s.Username == username && s.LogoutAt == null)
                .OrderByDescending(s => s.LoginAt)
                .FirstOrDefaultAsync();

            if (session != null)
            {
                session.LastHeartbeat = DateTime.Now;
                await _context.SaveChangesAsync();
            }
        }
    }
}
