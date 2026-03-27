using Microsoft.AspNetCore.Http;

namespace API.Helpers
{
    public static class Extensions
    {
        public static void AddApplicationError(this HttpResponse response, string message){
            response.Headers.Append("Application-Error", message);
            response.Headers.Append("Access-Control-Expose-Headers","Application-Error");
            response.Headers.Append("Access-Control-Allow-Origin","*");
            
        }
    }
}