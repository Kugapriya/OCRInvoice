using API.Repo;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class StoresController : ControllerBase
{
    private StoreRepository _repo;
    private readonly IConfiguration _config;
    public StoresController(StoreRepository repo, IConfiguration config)
    {
        _repo = repo;
        _config = config;
    }

    [HttpGet("getStores/{username}")]
    public async Task<IActionResult> GetStoresByUser(string username)
    {
        if (string.IsNullOrEmpty(username))
            return BadRequest("Username is required.");

        var stores = await _repo.GetStoresForUserAsync(username);
        return Ok(stores);
    }
}
