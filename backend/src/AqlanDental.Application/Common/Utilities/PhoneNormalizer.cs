using AqlanDental.Domain.Exceptions;

namespace AqlanDental.Application.Common.Utilities;

/// <summary>
/// Normalizes Yemeni phone numbers to international format +967XXXXXXXXX.
/// Supports mobile prefixes: 70, 71, 73, 77.
/// Supports landline prefix: 01.
/// Accepts inputs like: 77XXXXXXX, 077XXXXXXX, +9677XXXXXXX, 009677XXXXXXX, 9677XXXXXXX.
/// </summary>
public static class PhoneNormalizer
{
    private static readonly HashSet<string> MobilePrefixes = new() { "70", "71", "73", "77" };
    private const string YemenCountryCode = "967";
    private const string InternationalPrefix = "+967";
    private const int MobileNumberLength = 9;  // e.g., 77XXXXXXX
    private const int LandlineLocalLength = 8; // e.g., 01XXXXXX

    /// <summary>
    /// Normalizes a Yemeni phone number to international format.
    /// Returns the normalized number starting with +967.
    /// Throws DomainException if the number is invalid.
    /// </summary>
    public static string Normalize(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            throw new DomainException("INVALID_PHONE_NUMBER", "رقم الهاتف غير صالح");

        // Remove spaces, hyphens, parentheses, dots
        var cleaned = phone.Replace(" ", "")
                          .Replace("-", "")
                          .Replace("(", "")
                          .Replace(")", "")
                          .Replace(".", "")
                          .Trim();

        if (cleaned.StartsWith("+967"))
        {
            var localPart = cleaned[4..];
            return ValidateAndFormat(localPart);
        }

        if (cleaned.StartsWith("00967"))
        {
            var localPart = cleaned[5..];
            return ValidateAndFormat(localPart);
        }

        if (cleaned.StartsWith("967") && cleaned.Length > 6)
        {
            var localPart = cleaned[3..];
            return ValidateAndFormat(localPart);
        }

        if (cleaned.StartsWith("0"))
        {
            var localPart = cleaned[1..];
            return ValidateAndFormat(localPart);
        }

        return ValidateAndFormat(cleaned);
    }

    /// <summary>
    /// Tries to normalize a phone number. Returns null if invalid instead of throwing.
    /// </summary>
    public static string? TryNormalize(string phone)
    {
        try
        {
            return Normalize(phone);
        }
        catch (DomainException)
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the WhatsApp-friendly format (same as international without the +).
    /// e.g., 9677XXXXXXX
    /// </summary>
    public static string GetWhatsAppFormat(string normalizedPhone)
    {
        if (normalizedPhone.StartsWith("+"))
            return normalizedPhone[1..];
        return normalizedPhone;
    }

    private static string ValidateAndFormat(string localPart)
    {
        // Mobile number: 9 digits starting with 70/71/73/77
        if (localPart.Length == MobileNumberLength && IsMobilePrefix(localPart))
        {
            return $"{InternationalPrefix}{localPart}";
        }

        // Landline: 7 digits starting with 1 (after removing the leading 0)
        if (localPart.Length == LandlineLocalLength - 1 && localPart.StartsWith("1"))
        {
            return $"{InternationalPrefix}{localPart}";
        }

        // Landline with area code: 8 digits starting with 01
        if (localPart.Length == LandlineLocalLength && localPart.StartsWith("1"))
        {
            return $"{InternationalPrefix}{localPart}";
        }

        throw new DomainException("INVALID_PHONE_NUMBER", "رقم الهاتف غير صالح");
    }

    private static bool IsMobilePrefix(string number)
    {
        if (number.Length < 2) return false;
        var prefix = number[..2];
        return MobilePrefixes.Contains(prefix);
    }
}
