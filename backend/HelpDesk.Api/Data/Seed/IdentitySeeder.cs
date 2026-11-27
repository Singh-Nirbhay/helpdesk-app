using HelpDesk.Api.Constants;
using HelpDesk.Api.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace HelpDesk.Api.Data.Seed;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();

        var provider = scope.ServiceProvider;

        var environment = provider.GetRequiredService<IHostEnvironment>();

        if (!environment.IsDevelopment())
        {
            return;
        }

        var roleManager = provider
            .GetRequiredService<RoleManager<IdentityRole>>();

        var userManager = provider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var configuration = provider
            .GetRequiredService<IConfiguration>();

        var dbContext = provider
            .GetRequiredService<HelpDeskDbContext>();

        var seedPassword = configuration["Seed:DefaultPassword"];

        if (string.IsNullOrWhiteSpace(seedPassword))
        {
            throw new InvalidOperationException(
                "Development seed password is not configured.");
        }

        await using var transaction =
            await dbContext.Database.BeginTransactionAsync();

        string[] roles =
        [
            AppRoles.Customer,
            AppRoles.Agent,
            AppRoles.Manager,
            AppRoles.Admin
        ];

        foreach (var role in roles)
        {
            await EnsureRoleAsync(roleManager, role);
        }

        await EnsureDemoUserAsync(
            userManager,
            "Demo Customer",
            "customer@helpdesk.local",
            AppRoles.Customer,
            seedPassword);

        await EnsureDemoUserAsync(
            userManager,
            "Demo Agent",
            "agent@helpdesk.local",
            AppRoles.Agent,
            seedPassword);

        await EnsureDemoUserAsync(
            userManager,
            "Demo Manager",
            "manager@helpdesk.local",
            AppRoles.Manager,
            seedPassword);

        await EnsureDemoUserAsync(
            userManager,
            "Demo Admin",
            "admin@helpdesk.local",
            AppRoles.Admin,
            seedPassword);

        await transaction.CommitAsync();
    }

    private static async Task EnsureRoleAsync(
        RoleManager<IdentityRole> roleManager,
        string role)
    {
        if (await roleManager.RoleExistsAsync(role))
        {
            return;
        }

        var result = await roleManager.CreateAsync(
            new IdentityRole(role));

        EnsureSucceeded(result, $"Create role '{role}'");
    }

    private static async Task EnsureDemoUserAsync(
        UserManager<ApplicationUser> userManager,
        string fullName,
        string email,
        string role,
        string password)
    {
        var user = await userManager.FindByEmailAsync(email);

        if (user is not null)
        {
            var existingRoles = await userManager.GetRolesAsync(user);

            if (existingRoles.Count != 1 ||
                !await userManager.IsInRoleAsync(user, role))
            {
                throw new InvalidOperationException(
                    $"Demo account '{email}' has unexpected roles. " +
                    "Review the account before continuing.");
            }

            return;
        }

        user = new ApplicationUser
        {
            FullName = fullName,
            Email = email,
            UserName = email,
            EmailConfirmed = true
        };

        var createResult = await userManager.CreateAsync(
            user, password);

        EnsureSucceeded(createResult, $"Create user '{email}'");

        var roleResult = await userManager.AddToRoleAsync(
            user, role);

        EnsureSucceeded(
            roleResult,
            $"Assign role '{role}' to '{email}'");
    }

    private static void EnsureSucceeded(
        IdentityResult result,
        string operation)
    {
        if (result.Succeeded)
        {
            return;
        }

        var errors = string.Join(
            "; ",
            result.Errors.Select(error =>
                $"{error.Code}: {error.Description}"));

        throw new InvalidOperationException(
            $"{operation} failed. {errors}");
    }
}