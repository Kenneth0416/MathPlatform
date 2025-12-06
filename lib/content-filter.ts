// 内容过滤器 - 检测和拒绝色情暴力相关内容
// 支持多语言（繁体中文、简体中文、英文）

export type Language = 'zh-TW' | 'zh-CN' | 'en'

export interface FilterResult {
  isBlocked: boolean
  blockedContent?: string[]
  language: Language
}

export interface BlockedContentResponse {
  shouldBlock: boolean
  message?: string
}

// 多语言敏感词库
const SENSITIVE_WORDS = {
  'zh-TW': {
    explicit: [
      '性交', '做愛', '性愛', '淫蕩', '色情', 'A片', '黃色', '成人',
      '裸體', '裸照', '性器官', '自慰', '手淫', '性高潮', '陰莖',
      '陰道', '乳房', '乳頭', '性虐', '強姦', '輪姦', '性騷擾',
      '性侵', '猥褻', '露體', '賣淫', '嫖娼', '性交易', '性服務',
      '性玩具', '情趣用品', 'SM', 'BDSM', '性癖', '變態', '性幻想'
    ],
    violence: [
      '殺人', '殺死', '殺害', '謀殺', '自殺', '自殘', '自盡', '死亡',
      '暴力', '殴打', '毆打', '打架', '鬥毆', '攻擊', '傷害', '殘害',
      '虐待', '酷刑', '折磨', '摧殘', '虐殺', '屠殺', '滅絕', '血腥',
      '流血', '血案', '血洗', '報復', '復仇', '報仇', '恐嚇', '威脅',
      '恐怖', '恐怖襲擊', '炸彈', '爆炸', '武器', '槍支', '刀劍',
      '毒藥', '投毒', '縱火', '放火', '綁架', '劫持', '人質'
    ],
    hate: [
      '種族歧視', '歧視', '種族主義', '仇恨', '憎恨', '辱罵', '謾罵',
      '侮辱', '羞辱', '貶低', '抹黑', '詆毀', '污衊', '謠言', '誹謗',
      '妖魔化', '排斥', '敵視', '敵意', '偏見', '刻板印象', '歧視性',
      '族裔', '膚色', '國籍', '宗教歧視', '性別歧視', '性取向歧視'
    ]
  },
  'zh-CN': {
    explicit: [
      '性交', '做爱', '性爱', '淫荡', '色情', 'A片', '黄色', '成人',
      '裸体', '裸照', '性器官', '自慰', '手淫', '性高潮', '阴茎',
      '阴道', '乳房', '乳头', '性虐', '强奸', '轮奸', '性骚扰',
      '性侵', '猥亵', '露体', '卖淫', '嫖娼', '性交易', '性服务',
      '性玩具', '情趣用品', 'SM', 'BDSM', '性癖', '变态', '性幻想'
    ],
    violence: [
      '杀人', '杀死', '杀害', '谋杀', '自杀', '自残', '自尽', '死亡',
      '暴力', '殴打', '殴打', '打架', '斗殴', '攻击', '伤害', '残害',
      '虐待', '酷刑', '折磨', '摧残', '虐杀', '屠杀', '灭绝', '血腥',
      '流血', '血案', '血洗', '报复', '复仇', '报仇', '恐吓', '威胁',
      '恐怖', '恐怖袭击', '炸弹', '爆炸', '武器', '枪支', '刀剑',
      '毒药', '投毒', '纵火', '放火', '绑架', '劫持', '人质'
    ],
    hate: [
      '种族歧视', '歧视', '种族主义', '仇恨', '憎恨', '辱骂', '谩骂',
      '侮辱', '羞辱', '贬低', '抹黑', '诋毁', '污蔑', '谣言', '诽谤',
      '妖魔化', '排斥', '敌视', '敌意', '偏见', '刻板印象', '歧视性',
      '族裔', '肤色', '国籍', '宗教歧视', '性别歧视', '性取向歧视'
    ]
  },
  'en': {
    explicit: [
      'sex', 'sexual', 'intercourse', 'fuck', 'fucking', 'porn', 'pornography',
      'erotic', 'nude', 'naked', 'breast', 'penis', 'vagina', 'orgasm',
      'masturbation', 'masturbate', 'rape', 'sexual assault', 'molestation',
      'prostitution', 'escort', 'adult entertainment', 'strip', 'stripper',
      'bordello', 'brothel', 'SM', 'BDSM', 'fetish', 'kinky', 'orgy'
    ],
    violence: [
      'kill', 'murder', 'suicide', 'die', 'death', 'violent', 'violence',
      'assault', 'attack', 'abuse', 'torture', 'brutal', 'slaughter',
      'massacre', 'genocide', 'bloody', 'blood', 'revenge', 'threaten',
      'threat', 'terror', 'terrorism', 'bomb', 'explosion', 'weapon',
      'gun', 'knife', 'poison', 'poisoning', 'arson', 'kidnap', 'hostage'
    ],
    hate: [
      'racist', 'racism', 'discrimination', 'hate', 'hate speech', 'slur',
      'insult', 'offensive', 'derogatory', 'prejudice', 'bigotry',
      'harassment', 'bullying', 'intimidation', 'scapegoating', 'stereotype',
      'ethnicity', 'nationality', 'religion', 'gender', 'sexual orientation'
    ]
  }
}

// 多语言拒绝回复模板
const REJECTION_MESSAGES = {
  'zh-TW': {
    explicit: '抱歉，我無法回答涉及色情或成人內容的問題。如果您有數學學習相關的問題，我很樂意為您提供幫助。',
    violence: '抱歉，我無法回答涉及暴力或傷害性內容的問題。如果您有數學學習相關的問題，我很樂意為您提供幫助。',
    hate: '抱歉，我無法回答涉及仇恨或歧視性內容的問題。如果您有數學學習相關的問題，我很樂意為您提供幫助。',
    general: '抱歉，我無法回答此類問題。如果您有數學學習相關的問題，我很樂意為您提供幫助。'
  },
  'zh-CN': {
    explicit: '抱歉，我无法回答涉及色情或成人内容的问题。如果您有数学学习相关的问题，我很乐意为您提供帮助。',
    violence: '抱歉，我无法回答涉及暴力或伤害性内容的问题。如果您有数学学习相关的问题，我很乐意为您提供帮助。',
    hate: '抱歉，我无法回答涉及仇恨或歧视性内容的问题。如果您有数学学习相关的问题，我很乐意为您提供帮助。',
    general: '抱歉，我无法回答此类问题。如果您有数学学习相关的问题，我很乐意为您提供帮助。'
  },
  'en': {
    explicit: 'Sorry, I cannot answer questions involving explicit or adult content. I\'d be happy to help with math learning related questions.',
    violence: 'Sorry, I cannot answer questions involving violent or harmful content. I\'d be happy to help with math learning related questions.',
    hate: 'Sorry, I cannot answer questions involving hate speech or discriminatory content. I\'d be happy to help with math learning related questions.',
    general: 'Sorry, I cannot answer this type of question. I\'d be happy to help with math learning related questions.'
  }
}

export class ContentFilter {
  private language: Language

  constructor(language: Language = 'zh-TW') {
    this.language = language
  }

  // 检测单个字符串是否包含敏感内容
  detectSensitiveContent(text: string): FilterResult {
    const lowerText = text.toLowerCase()
    const blockedWords: string[] = []

    const words = SENSITIVE_WORDS[this.language]

    // 检测各类敏感词
    for (const category in words) {
      const categoryWords = words[category as keyof typeof words]
      for (const word of categoryWords) {
        if (lowerText.includes(word.toLowerCase())) {
          blockedWords.push(word)
        }
      }
    }

    return {
      isBlocked: blockedWords.length > 0,
      blockedContent: blockedWords.length > 0 ? blockedWords : undefined,
      language: this.language
    }
  }

  // 检测消息数组是否包含敏感内容
  detectSensitiveMessages(messages: Array<{content: string}>): FilterResult {
    let allBlockedWords: string[] = []

    for (const message of messages) {
      const result = this.detectSensitiveContent(message.content)
      if (result.blockedContent) {
        allBlockedWords = allBlockedWords.concat(result.blockedContent)
      }
    }

    return {
      isBlocked: allBlockedWords.length > 0,
      blockedContent: allBlockedWords.length > 0 ? allBlockedWords : undefined,
      language: this.language
    }
  }

  // 获取拒绝回复
  getRejectionMessage(type: 'explicit' | 'violence' | 'hate' | 'general' = 'general'): string {
    return REJECTION_MESSAGES[this.language][type]
  }

  // 过滤并返回是否应该阻止
  shouldBlockResponse(inputText: string): BlockedContentResponse {
    const result = this.detectSensitiveContent(inputText)

    if (!result.isBlocked) {
      return { shouldBlock: false }
    }

    // 确定内容类型
    const words = SENSITIVE_WORDS[this.language]
    let contentType: 'explicit' | 'violence' | 'hate' | 'general' = 'general'

    if (result.blockedContent?.some(word => words.explicit.includes(word))) {
      contentType = 'explicit'
    } else if (result.blockedContent?.some(word => words.violence.includes(word))) {
      contentType = 'violence'
    } else if (result.blockedContent?.some(word => words.hate.includes(word))) {
      contentType = 'hate'
    }

    return {
      shouldBlock: true,
      message: this.getRejectionMessage(contentType)
    }
  }

  // 跨语言检测 - 检测所有语言的违规内容
  detectAndFilterMultipleLanguages(text: string, userLanguage: Language = 'zh-TW'): BlockedContentResponse {
    // 尝试所有语言的检测
    const languages: Language[] = ['zh-TW', 'zh-CN', 'en']
    let allBlockedWords: string[] = []
    let contentType: 'explicit' | 'violence' | 'hate' | 'general' = 'general'
    let shouldBlock = false

    for (const lang of languages) {
      const filter = new ContentFilter(lang)
      const result = filter.detectSensitiveContent(text)

      if (result.isBlocked && result.blockedContent) {
        allBlockedWords = allBlockedWords.concat(result.blockedContent)
        shouldBlock = true

        // 确定内容类型（按照严重程度：hate > violence > explicit）
        const words = SENSITIVE_WORDS[lang]
        if (result.blockedContent.some(word => words.hate.includes(word))) {
          contentType = 'hate'
        } else if (result.blockedContent.some(word => words.violence.includes(word))) {
          contentType = contentType === 'hate' ? 'hate' : 'violence'
        } else if (result.blockedContent.some(word => words.explicit.includes(word))) {
          contentType = (contentType === 'hate' || contentType === 'violence') ? contentType : 'explicit'
        }
      }
    }

    if (shouldBlock) {
      // 使用用户指定的语言返回拒绝消息
      const userFilter = new ContentFilter(userLanguage)
      return {
        shouldBlock: true,
        message: userFilter.getRejectionMessage(contentType),
        detectedContent: allBlockedWords,
        contentType
      }
    }

    return { shouldBlock: false }
  }
}

// 便捷函数
export function createContentFilter(language: Language = 'zh-TW'): ContentFilter {
  return new ContentFilter(language)
}

// 全局内容过滤器实例
export const globalContentFilter = new ContentFilter('zh-TW')