namespace API.Dtos
{
    public class ResetPasswordDto
    {
        public string Token { get; set; } = "";
        public string NewPassword { get; set; } = "";
        public string ConfirmPassword { get; set; } = "";
    }

    // public class ResetPasswordResponseDto
    // {
    //     public bool Success { get; set; }
    //     public string Message { get; set; } = "";
    // }
}
