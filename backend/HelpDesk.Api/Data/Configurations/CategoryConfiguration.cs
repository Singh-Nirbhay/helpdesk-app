using HelpDesk.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HelpDesk.Api.Data.Configurations;

public class CategoryConfiguration
    : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(c => c.Name)
            .IsUnique();

        builder.HasData(
         new Category { Id = 1, Name = "General", IsActive = true },
         new Category { Id = 2, Name = "Technical", IsActive = true },
         new Category { Id = 3, Name = "Billing", IsActive = true },
         new Category { Id = 4, Name = "Access", IsActive = true }
     );
    }
}
