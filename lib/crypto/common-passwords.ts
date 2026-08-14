/**
 * A small, offline blocklist of the most commonly breached passwords
 * (derived from widely published top-password lists). Not exhaustive —
 * just enough to stop the most obviously guessable choices at signup.
 */
export const COMMON_PASSWORDS = new Set(
  [
    "123456", "123456789", "12345678", "1234567", "12345", "1234567890",
    "password", "password1", "password123", "iloveyou", "111111", "222222",
    "123123", "abc123", "qwerty", "qwerty123", "qwertyuiop", "1q2w3e4r",
    "letmein", "welcome", "welcome1", "monkey", "dragon", "sunshine",
    "princess", "football", "baseball", "basketball", "master", "shadow",
    "michael", "jennifer", "jordan", "superman", "batman", "trustno1",
    "admin", "admin123", "administrator", "root", "toor", "changeme",
    "default", "guest", "test123", "student", "teacher", "school",
    "school123", "pakistan", "pakistan123", "islamabad", "lahore",
    "karachi", "12345678910", "987654321", "0123456789", "11111111",
    "88888888", "00000000", "aaaaaaaa", "asdfghjk", "asdfasdf", "zxcvbnm",
    "1qaz2wsx", "abcd1234", "a1b2c3d4", "qazwsx", "passw0rd", "p@ssw0rd",
    "p@ssword", "Password1", "Password123", "welcome123", "letmein123",
    "freedom", "whatever", "nothing", "starwars", "pokemon", "minecraft",
    "hunter2", "summer2025", "summer2026", "winter2025", "winter2026",
    "january2026", "spring2026", "hello123", "hello1234", "iloveyou1",
    "iloveyou123", "myspace1", "blink182", "flower", "sunflower",
    "cheese", "chocolate", "computer", "internet", "network", "gateway",
    "matrix", "ninja", "dragon123", "tigger", "charlie", "andrew",
    "daniel", "joshua", "anthony", "william", "george", "thomas",
  ].map((p) => p.toLowerCase())
);
