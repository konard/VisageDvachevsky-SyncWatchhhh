/**
 * Anonymous Name Generator
 * Generate anonymous nicknames for privacy-conscious users
 */

const ADJECTIVES = [
  'Swift',
  'Clever',
  'Brave',
  'Calm',
  'Eager',
  'Bold',
  'Gentle',
  'Happy',
  'Jolly',
  'Kind',
  'Lively',
  'Mighty',
  'Noble',
  'Proud',
  'Quick',
  'Silent',
  'Witty',
  'Zesty',
  'Agile',
  'Bright',
];

const ANIMALS = [
  'Fox',
  'Owl',
  'Bear',
  'Wolf',
  'Hawk',
  'Eagle',
  'Tiger',
  'Lion',
  'Panda',
  'Falcon',
  'Raven',
  'Lynx',
  'Otter',
  'Deer',
  'Badger',
  'Swan',
  'Crane',
  'Heron',
  'Shark',
  'Dolphin',
];

/**
 * Generate a random anonymous nickname
 * Format: AdjectiveAnimalNumber (e.g., "SwiftFox123")
 */
export function generateAnonymousNickname(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}${animal}${number}`;
}

/**
 * Check if a nickname looks like an anonymous one
 */
export function isAnonymousNickname(nickname: string): boolean {
  // Pattern: AdjectiveAnimal + 1-3 digits
  const pattern = new RegExp(
    `^(${ADJECTIVES.join('|')})(${ANIMALS.join('|')})\\d{1,3}$`
  );
  return pattern.test(nickname);
}
