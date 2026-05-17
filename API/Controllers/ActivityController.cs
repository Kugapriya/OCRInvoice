using System.Security.Claims;
using API.Dtos;
using API.Repo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ActivityController : ControllerBase
    {
        private readonly ActivityRepository _repo;

        public ActivityController(ActivityRepository repo)
        {
            _repo = repo;
        }

        [HttpPost("log")]
        public async Task<IActionResult> LogActivity([FromBody] LogActivityDto dto)
        {
            var username = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _repo.LogActivityAsync(username, dto.ActivityType, dto.Detail, dto.CustomerId, ip);
            return Ok(new { success = true });
        }

        [HttpPost("heartbeat")]
        public async Task<IActionResult> Heartbeat()
        {
            var username = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            await _repo.UpdateHeartbeatAsync(username);
            return Ok(new { success = true });
        }

    }
}
