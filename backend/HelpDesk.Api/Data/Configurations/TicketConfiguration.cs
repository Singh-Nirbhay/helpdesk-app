using HelpDesk.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HelpDesk.Api.Data.Configurations;

public class TicketConfiguration
    : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> builder)
    {

    // Property configurations

        builder.HasKey(t => t.Id);

        builder.Property(t => t.TicketNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(t => t.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(t => t.Description)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(t => t.Status)
            .HasConversion<int>();

        builder.Property(t => t.CreatedById)
            .IsRequired()
            .HasMaxLength(450);

        builder.Property(t => t.AssignedToId)
            .HasMaxLength(450)
            .IsRequired(false);

    // Indexes

        builder.HasIndex(t => t.TicketNumber)
           .IsUnique();

        builder.HasIndex(t => t.Status);

        builder.HasIndex(t => t.CreatedById);

        builder.HasIndex(t => t.AssignedToId);

    // Lookup Relationships

        builder.HasOne(t => t.Category)
            .WithMany()
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(deleteBehavior: DeleteBehavior.Restrict);

        builder.HasOne(t => t.Priority)
            .WithMany()
            .HasForeignKey(t => t.PriorityId)
            .OnDelete(deleteBehavior: DeleteBehavior.Restrict);

        // User Relationship

        builder.HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedById)
            .OnDelete(deleteBehavior: DeleteBehavior.Restrict);

        builder.HasOne(t => t.AssignedTo)
            .WithMany()
            .HasForeignKey(t => t.AssignedToId)
            .OnDelete(deleteBehavior: DeleteBehavior.Restrict);

    }
}
