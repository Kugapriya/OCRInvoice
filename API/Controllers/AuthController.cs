using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.Dtos;
using API.Repo;
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

        public AuthController(AuthRepository repo, CustomerRepository customerRepo, IConfiguration config)
        {
            _config = config;
            _repo = repo;
            _customerRepo = customerRepo;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Username and password are required");

            var user = await _repo.Login(dto.Username.Trim().ToLower(), dto.Password.Trim());
            if (user == null)
                return Unauthorized(new { message = "Invalid username or password" });

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

            return Ok(new { token = tokenHandler.WriteToken(token), user });
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

            // Always log OTP to console so it can be used even when email is not configured
            Console.WriteLine($"[OTP] {dto.Email.Trim()} => {otp}");

            var emailBody = $@"
            <div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px'>
              <h2 style='color:#1e3a8a;margin-bottom:8px'>Password Reset OTP</h2>
              <p style='color:#555'>Hello <strong>{user.Name}</strong>,</p>
              <p style='color:#555'>Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
              <div style='font-size:38px;font-weight:700;letter-spacing:10px;color:#1d4ed8;
                          background:#eef4ff;padding:22px;text-align:center;
                          border-radius:10px;margin:24px 0'>{otp}</div>
              <p style='color:#999;font-size:12px'>If you did not request this, please ignore this email.</p>
            </div>";

            var sent = await _customerRepo.SendEmail(user.Email!, "Your Password Reset OTP", emailBody);

            var message = sent ? "OTP sent to your email" : "OTP generated — check server console";
            return Ok(new { success = true, message });
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

            var updated = await _repo.UpdatePasswordAsync(user.Username, dto.NewPassword);
            if (!updated) return BadRequest(new { success = false, message = "Failed to update password" });

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
