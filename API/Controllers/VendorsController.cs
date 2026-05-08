using API.Models;
using API.Repo;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly VendorRepository _repo;

    public VendorsController(VendorRepository repo)
    {
        _repo = repo;
    }

    [HttpGet("getall")]
    public async Task<IActionResult> GetAllVendors()
    {
        try
        {
            var vendors = await _repo.GetAllVendorsAsync();
            return Ok(vendors);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving vendors", error = ex.Message });
        }
    }

    [HttpGet("get/{id}")]
    public async Task<IActionResult> GetVendorById(int id)
    {
        try
        {
            if (id <= 0)
                return BadRequest("Invalid vendor ID");

            var vendor = await _repo.GetVendorByIdAsync(id);
            if (vendor == null)
                return NotFound("Vendor not found");

            return Ok(vendor);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving vendor", error = ex.Message });
        }
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateVendor(Vendor vendor)
    {
        try
        {
            int rows = await _repo.CreateVendorAsync(vendor);

            if (rows == 0)
                return StatusCode(500, "Failed to create vendor");

            return Ok(vendor);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating vendor", error = ex.Message });
        }
    }

    [HttpPut("update")]
    public async Task<IActionResult> UpdateVendor([FromBody] Vendor vendor)
    {
        try
        {
            if (vendor == null || vendor.ID <= 0)
                return BadRequest("Invalid vendor data");

            if (string.IsNullOrWhiteSpace(vendor.SupplierName))
                return BadRequest("SupplierName is required");

            var existingVendor = await _repo.GetVendorByIdAsync(vendor.ID);
            if (existingVendor == null)
                return NotFound("Vendor not found");

            // Check if another vendor with the same name exists (case-insensitive)
            // bool nameExists = await _repo.VendorExistsAsync(vendor.SupplierName, vendor.ID);
            // if (nameExists)
            //     return BadRequest(new { message = "Another vendor with this supplier name already exists" });

            bool updated = await _repo.UpdateVendorAsync(vendor);
            if (!updated)
                return StatusCode(500, "Failed to update vendor");

            return Ok(new { message = "Vendor updated successfully", vendor });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating vendor", error = ex.Message });
        }
    }

    [HttpDelete("delete/{id}")]
    public async Task<IActionResult> DeleteVendor(int id)
    {
        try
        {
            if (id <= 0)
                return BadRequest("Invalid vendor ID");

            var vendor = await _repo.GetVendorByIdAsync(id);
            if (vendor == null)
                return NotFound("Vendor not found");

            bool deleted = await _repo.DeleteVendorAsync(id);
            if (!deleted)
                return StatusCode(500, "Failed to delete vendor");

            return Ok(new { message = "Vendor deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting vendor", error = ex.Message });
        }
    }
}
