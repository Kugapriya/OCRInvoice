using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.DataAccess
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> options) : base(options) { }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<EmailSetup> EmailSetups { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Store> Stores { get; set; }
        public DbSet<AssignedStores> AssignStore { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<AssignedStores>().HasKey(ans => new { ans.Username, ans.StoreId });
            modelBuilder.Entity<AssignedStores>().HasOne(ans => ans.User).WithMany(u => u.Stores).HasForeignKey(ans => ans.Username);
            modelBuilder.Entity<AssignedStores>().HasOne(ans => ans.Store).WithMany(s => s.Users).HasForeignKey(ans => ans.StoreId);
        }

    }
}