using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AqlanDental.Infrastructure.Services;

public class JwtService : IJwtService
{
    private readonly AqlanDentalDbContext _context;
    private readonly IConfiguration _configuration;

    public JwtService(AqlanDentalDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResult> GenerateTokensAsync(string userId, string fullName, IList<string> roles)
    {
        var (tokenString, jwtToken) = GenerateAccessToken(userId, fullName, roles);
        var refreshToken = GenerateRefreshToken();

        var jwtId = jwtToken.Payload.Jti
            ?? throw new InvalidOperationException("فشل في إنشاء معرف الرمز");

        var refreshTokenEntity = new RefreshToken
        {
            UserId = userId,
            Token = refreshToken,
            JwtId = jwtId,
            IsUsed = false,
            IsRevoked = false,
            ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshTokenExpiryDays()),
            CreatedAt = DateTime.UtcNow
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync();

        var expiryMinutes = GetAccessTokenExpiryMinutes();

        return new AuthResult(
            AccessToken: tokenString,
            RefreshToken: refreshToken,
            ExpiresAt: DateTime.UtcNow.AddMinutes(expiryMinutes),
            UserId: userId,
            FullName: fullName,
            Roles: roles
        );
    }

    public async Task<AuthResult> RefreshTokenAsync(string refreshToken, string accessToken)
    {
        var storedToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedToken is null)
        {
            throw new UnauthorizedAccessException("رمز التحديث غير صالح");
        }

        if (storedToken.IsUsed)
        {
            throw new UnauthorizedAccessException("رمز التحديث مستخدم بالفعل");
        }

        if (storedToken.IsRevoked)
        {
            throw new UnauthorizedAccessException("رمز التحديث ملغى");
        }

        if (storedToken.IsExpired)
        {
            throw new UnauthorizedAccessException("رمز التحديث منتهي الصلاحية");
        }

        // Validate the access token's JWT ID matches
        var jwtToken = ReadJwtToken(accessToken);
        var jwtId = jwtToken.Payload.Jti;

        if (jwtId != storedToken.JwtId)
        {
            throw new UnauthorizedAccessException("رمز التحديث لا يتطابق مع رمز الوصول");
        }

        // Mark current refresh token as used
        storedToken.IsUsed = true;
        _context.RefreshTokens.Update(storedToken);
        await _context.SaveChangesAsync();

        // Generate new tokens
        var user = storedToken.User;
        var roles = await _context.UserRoles
            .Where(ur => ur.UserId == user.Id)
            .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name!)
            .ToListAsync();

        return await GenerateTokensAsync(user.Id, user.FullName, roles);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var storedToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedToken is null)
        {
            throw new UnauthorizedAccessException("رمز التحديث غير موجود");
        }

        storedToken.IsRevoked = true;
        _context.RefreshTokens.Update(storedToken);
        await _context.SaveChangesAsync();
    }

    private (string TokenString, JwtSecurityToken JwtToken) GenerateAccessToken(
        string userId, string fullName, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Email, userId),
            new("fullName", fullName),
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiryMinutes = GetAccessTokenExpiryMinutes();

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, token);
    }

    private static string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    private static JwtSecurityToken ReadJwtToken(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        return handler.ReadJwtToken(token);
    }

    private int GetAccessTokenExpiryMinutes()
        => _configuration.GetValue("Jwt:AccessTokenExpiryMinutes", 60);

    private int GetRefreshTokenExpiryDays()
        => _configuration.GetValue("Jwt:RefreshTokenExpiryDays", 7);
}
