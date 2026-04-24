using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.DataAccess;
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
        private readonly DataContext _context;

        public AuthController(AuthRepository repo, CustomerRepository customerRepo, IConfiguration config, DataContext context)
        {
            _config = config;
            _repo = repo;
            _customerRepo = customerRepo;
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Username and password are required");
            var username = dto.Username.Trim().ToLower();
            var password = dto.Password.Trim();
            var user = await _repo.Login(username, password);

            if (user == null)
                return Unauthorized("Invalid username or password");

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Username),
                new Claim(ClaimTypes.Name, user.Name ??""),
                new Claim(ClaimTypes.Role, user.Role ??"")
            };

            var tokenKey = _config["AppSettings:Token"]!;

            int minLength = 64;
            if (Encoding.UTF8.GetBytes(tokenKey).Length < minLength)
            {
                tokenKey = tokenKey.PadRight(minLength, '0');
            }

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

            return Ok(new
            {
                token = tokenHandler.WriteToken(token),
                user
            });
        }

        [HttpPost("forgot-password/{email}")]
        public async Task<IActionResult> ForgotPassword(string email)
        {

            var user = await _repo.FindUserByEmailAsync(email);
            if (user == null || string.IsNullOrEmpty(user.Email))
            {
                return Ok(new { success = false, message = "Email not found" });
            }

            var tokenKey = _config["AppSettings:Token"]!;
            if (Encoding.UTF8.GetBytes(tokenKey).Length < 64)
                tokenKey = tokenKey.PadRight(64, '0');

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var claims = new[]
            {
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim("reset", "true")
        };

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(15),
                SigningCredentials = creds
            };

            var resetToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));
            var clientUrl = _config["AppSettings:ClientUrl"];
            var resetLink = $"{clientUrl}?token={Uri.EscapeDataString(resetToken)}";

            var emailBody = $@"
            <p>Hello {user.Name},</p>
            <p>Click here to reset your password:</p>
            <p><a href='{resetLink}'>Reset Password</a></p>";

            var emailSent = await _customerRepo.SendEmail(user.Email!, "Password Reset", emailBody);

            if (!emailSent) return Ok(new { success = false, message = "Failed to send email" });

            return Ok(new { success = true, message = "Reset email sent" });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {

            if (dto.NewPassword != dto.ConfirmPassword)
            {
                return BadRequest(new { success = false, message = "Passwords do not match" });
            }

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            {
                return BadRequest(new { success = false, message = "Password must be at least 6 digits" });
            }
            if (string.IsNullOrEmpty(dto.Token))
            {
                return BadRequest(new { success = false, message = "Invalid token" });
            }

            var tokenKey = _config["AppSettings:Token"]!;
            if (Encoding.UTF8.GetBytes(tokenKey).Length < 64)
                tokenKey = tokenKey.PadRight(64, '0');

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));
            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                tokenHandler.ValidateToken(dto.Token, new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5),
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key
                }, out var validatedToken);
            }
            catch
            {
                return BadRequest(new { success = false, message = "Invalid or expired token" });
            }

            var jwt = tokenHandler.ReadJwtToken(dto.Token);
            var email = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
            var resetClaim = jwt.Claims.FirstOrDefault(c => c.Type == "reset")?.Value;

            // Debug: Log what we found
            System.Console.WriteLine($"Email from token: {email}");
            System.Console.WriteLine($"Reset claim: {resetClaim}");
            System.Console.WriteLine($"All claims: {string.Join(", ", jwt.Claims.Select(c => $"{c.Type}={c.Value}"))}");

            if (resetClaim != "true" || string.IsNullOrEmpty(email))
                return BadRequest(new { success = false, message = "Invalid token - email or reset claim missing" });

            var user = await _repo.FindUserByEmailAsync(email);
            if (user == null)
            {
                return BadRequest(new { success = false, message = $"User not found for email: {email}" });
            }

            var updated = await _repo.UpdatePasswordAsync(user.Username, dto.NewPassword);

            if (!updated) return BadRequest(new { success = false, message = "User not found" });

            return Ok(new { success = true, message = "Password reset successfully" });
        }
    }
}