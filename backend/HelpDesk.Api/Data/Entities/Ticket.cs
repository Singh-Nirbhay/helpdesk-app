namespace HelpDesk.Api.Data.Entities;




public class Ticket
{
    public int Id { get; set; }
    
    public string TicketNumber { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public int PriorityId { get; set; }
    public Priority Priority { get; set; } = null!;

    public TicketStatus Status { get; set; } = TicketStatus.New;

    public string CreatedById { get; set; } = string.Empty;

    public string? AssignedToId {  get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }   



}
