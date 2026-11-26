using HelpDesk.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Data
{
    public class HelpDeskDbContext
        : DbContext
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
