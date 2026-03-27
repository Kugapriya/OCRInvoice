public class EmailSetup
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string SmtpServer { get; set; } = "";
    public int Port { get; set; }
    public bool EnableSsl { get; set; }
}