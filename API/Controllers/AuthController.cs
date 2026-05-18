using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.Dtos;
using API.Repo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthRepository _repo;
        private readonly CustomerRepository _customerRepo;
        private readonly IConfiguration _config;
        private readonly ActivityRepository _activityRepo;

        public AuthController(AuthRepository repo, CustomerRepository customerRepo, IConfiguration config, ActivityRepository activityRepo)
        {
            _config = config;
            _repo = repo;
            _customerRepo = customerRepo;
            _activityRepo = activityRepo;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Username and password are required");

            var user = await _repo.Login(dto.Username.Trim().ToLower(), dto.Password.Trim());
            if (user == null)
            {
                var failIp = HttpContext.Connection.RemoteIpAddress?.ToString();
                var existingUser = await _repo.FindUserByUsernameAsync(dto.Username.Trim().ToLower());
                if (existingUser != null)
                    await _activityRepo.LogActivityAsync(existingUser.Username, "login_failed", "Invalid password", null, failIp);
                return Unauthorized(new { message = "Invalid username or password" });
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Username),
                new Claim(ClaimTypes.Name, user.Name ?? ""),
                new Claim(ClaimTypes.Role, user.Role ?? "")
            };

            var tokenKey = PadTokenKey(_config["AppSettings:Token"]!);
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(1),
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var sessionId = Guid.NewGuid().ToString();
            await _activityRepo.StartSessionAsync(user.Username, sessionId, ip);
            await _activityRepo.LogActivityAsync(user.Username, "login", null, null, ip);

            return Ok(new { token = tokenString, user });
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var username = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(username))
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                await _activityRepo.EndSessionAsync(username, ip);
            }
            return Ok(new { message = "Logged out" });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] SendOtpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { success = false, message = "Email is required" });

            var user = await _repo.FindUserByEmailAsync(dto.Email.Trim());
            if (user == null || string.IsNullOrEmpty(user.Email))
                return Ok(new { success = false, message = "Email not found" });

            var otp = _repo.GenerateAndStoreOtp(dto.Email.Trim());

            var emailBody = $@"
            <div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px'>
              <h2 style='color:#1e3a8a;margin-bottom:8px'>Password Reset OTP</h2>
              <p style='color:#555'>Hello <strong>{user.Name}</strong>,</p>
              <p style='color:#555'>Use the code below to reset your password. It expires in <strong>2 minutes</strong>.</p>
              <div style='font-size:38px;font-weight:700;letter-spacing:10px;color:#1d4ed8;
                          background:#eef4ff;padding:22px;text-align:center;
                          border-radius:10px;margin:24px 0'>{otp}</div>
              <p style='color:#999;font-size:12px'>If you did not request this, please ignore this email.</p>
            </div>";

            var sent = await _customerRepo.SendEmail(user.Email!, "Your Password Reset OTP", emailBody);

            if (sent)
                return Ok(new { success = true, message = "OTP sent to your email" });
            else
                return Ok(new { success = true, message = "Email not configured. Use the OTP shown below.", otp });
        }

        [HttpPost("verify-otp")]
        public IActionResult VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Otp))
                return BadRequest(new { success = false, message = "Email and OTP are required" });

            if (!_repo.VerifyOtp(dto.Email.Trim(), dto.Otp.Trim()))
                return Ok(new { success = false, message = "Invalid or expired OTP" });

            var tokenKey = PadTokenKey(_config["AppSettings:Token"]!);
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var claims = new[]
            {
                new Claim(ClaimTypes.Email, dto.Email.Trim()),
                new Claim("reset", "true")
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var resetToken = tokenHandler.WriteToken(tokenHandler.CreateToken(new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(10),
                SigningCredentials = creds
            }));

            return Ok(new { success = true, token = resetToken });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { success = false, message = "Passwords do not match" });

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return BadRequest(new { success = false, message = "Password must be at least 6 characters" });

            if (string.IsNullOrEmpty(dto.Token))
                return BadRequest(new { success = false, message = "Invalid token" });

            var tokenKey = PadTokenKey(_config["AppSettings:Token"]!);
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                tokenHandler.ValidateToken(dto.Token, new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(2),
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key
                }, out _);
            }
            catch
            {
                return BadRequest(new { success = false, message = "Invalid or expired token" });
            }

            var jwt = tokenHandler.ReadJwtToken(dto.Token);
            var email = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
            var resetClaim = jwt.Claims.FirstOrDefault(c => c.Type == "reset")?.Value;

            if (resetClaim != "true" || string.IsNullOrEmpty(email))
                return BadRequest(new { success = false, message = "Invalid token" });

            var user = await _repo.FindUserByEmailAsync(email);
            if (user == null)
                return BadRequest(new { success = false, message = "User not found" });

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var updated = await _repo.UpdatePasswordAsync(user.Username, dto.NewPassword);
            if (!updated)
            {
                await _activityRepo.LogActivityAsync(user.Username, "password_reset_failed", "Failed to update password", null, ip);
                return BadRequest(new { success = false, message = "Failed to update password" });
            }

            await _activityRepo.LogActivityAsync(user.Username, "password_reset_success", "Password reset successfully", null, ip);
            return Ok(new { success = true, message = "Password reset successfully" });
        }

        private string PadTokenKey(string tokenKey)
        {
            const int minLength = 64;
            return Encoding.UTF8.GetBytes(tokenKey).Length < minLength
                ? tokenKey.PadRight(minLength, '0')
                : tokenKey;
        }
    }
}
