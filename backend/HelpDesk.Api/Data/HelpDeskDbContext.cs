using HelpDesk.Api.Data.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Data
{
    public class HelpDeskDbContext
        : IdentityDbContext<ApplicationUser>
    {
        public HelpDeskDbContext(
            DbContextOptions<HelpDeskDbContext> options
            ) : base(options)
        {

        }

        public DbSet<Ticket> Tickets => Set<Ticket>();

        public DbSet<Category> Categories => Set<Category>();

        public DbSet<Priority> Priorities => Set<Priority>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(
                typeof(HelpDeskDbContext).Assembly
                );
        }
    }
}
