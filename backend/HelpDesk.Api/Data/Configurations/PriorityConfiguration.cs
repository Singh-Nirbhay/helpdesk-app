using HelpDesk.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HelpDesk.Api.Data.Configurations;

public class PriorityConfiguration
    : IEntityTypeConfiguration<Priority>
{
    public void Configure(EntityTypeBuilder<Priority> builder)
    {
        builder.ToTable("Priorities");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(c => c.Name)
            .IsUnique();

        builder.HasData(

            new Priority { Id = 1, Name = "Low", SortOrder = 1 },
            new Priority { Id = 2, Name = "Medium", SortOrder = 2 },
            new Priority { Id = 3, Name = "High", SortOrder = 3 },
            new Priority { Id = 4, Name = "Critical", SortOrder = 4 }

         );
    }
}
