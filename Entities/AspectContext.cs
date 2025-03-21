using Microsoft.EntityFrameworkCore;

namespace UvA.AspectsOfYou.Endpoint.Entities;

public class AspectContext(DbContextOptions<AspectContext> options) : DbContext(options)
{
    public DbSet<Answer> Answers { get; set; }
}