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
        private readonly CustomerRepository _repo;
        private readonly IConfiguration _config;
        private readonly DataContext _context;

        public AuthController(CustomerRepository repo, IConfiguration config, DataContext context)
        {
            _config = config;
            _repo = repo;
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto dto)
        {
            var user = await _repo.Login(dto);

            if (user == null)
                return Unauthorized("Invalid username or password");

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Username),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role)
            };

            // Get token from config
            var tokenKey = _config["AppSettings:Token"]!;

            // Pad to at least 64 bytes for HMAC-SHA512
            int minLength = 64;
            if (Encoding.UTF8.GetBytes(tokenKey).Length < minLength)
            {
                tokenKey = tokenKey.PadRight(minLength, '0'); // pad with '0'
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
    }
}