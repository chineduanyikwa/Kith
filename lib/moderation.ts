export const PROFANITY_KEYWORDS = [
  // Severe profanity / vulgar
  'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking', 'fuckin', 'fckin',
  'motherfucker', 'motherfuckers', 'mf',
  'shit', 'shits', 'shitty', 'shithead', 'bullshit',
  'bitch', 'bitches', 'bitching',
  'cunt', 'cunts',
  'asshole', 'assholes',
  'bastard', 'bastards',
  'dick', 'dickhead', 'dickheads',
  'cock', 'cocks',
  'pussy', 'pussies',
  'slut', 'sluts',
  'whore', 'whores',
  'twat', 'twats',
  'prick', 'pricks',

  // Racial / ethnic slurs
  'nigger', 'niggers', 'nigga', 'niggas',
  'kike', 'kikes',
  'spic', 'spics',
  'chink', 'chinks',
  'gook', 'gooks',
  'wetback', 'wetbacks',
  'coon', 'coons',
  'jigaboo',
  'raghead', 'ragheads',
  'towelhead', 'towelheads',
  'sand nigger', 'sand niggers',

  // Anti-LGBTQ slurs
  'faggot', 'faggots', 'fag', 'fags',
  'dyke', 'dykes',
  'tranny', 'trannies',
  'shemale', 'shemales',
  'homo',

  // Anti-disability slurs
  'retard', 'retards', 'retarded', 'tard',

  // Dehumanising
  'subhuman', 'subhumans',
];

export function containsProfanity(text: string): boolean {
  return PROFANITY_KEYWORDS.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });
}
