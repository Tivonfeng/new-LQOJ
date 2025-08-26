import { DifficultyLevel, TextType, TextTemplate, TypingConfig } from '../types/typing';

export class TextGeneratorService {
    private textTemplates: Map<string, TextTemplate[]> = new Map();
    
    constructor(private config: TypingConfig) {
        this.initializeTextTemplates();
    }

    /**
     * 初始化文本模板库
     */
    private initializeTextTemplates(): void {
        // 编程类文本模板
        const programmingTexts = {
            [DifficultyLevel.BEGINNER]: [
                'function hello() { console.log("Hello World"); }',
                'let x = 10; let y = 20; let sum = x + y;',
                'const name = "TypeScript"; const version = "5.0";',
                'if (true) { return "success"; } else { return "fail"; }',
                'for (let i = 0; i < 10; i++) { console.log(i); }'
            ],
            [DifficultyLevel.INTERMEDIATE]: [
                'class Solution { public int[] twoSum(int[] nums, int target) { Map<Integer, Integer> map = new HashMap<>(); for (int i = 0; i < nums.length; i++) { int complement = target - nums[i]; if (map.containsKey(complement)) { return new int[]{map.get(complement), i}; } map.put(nums[i], i); } throw new IllegalArgumentException("No two sum solution"); } }',
                'function quickSort(arr: number[]): number[] { if (arr.length <= 1) return arr; const pivot = arr[Math.floor(arr.length / 2)]; const left = arr.filter(x => x < pivot); const middle = arr.filter(x => x === pivot); const right = arr.filter(x => x > pivot); return [...quickSort(left), ...middle, ...quickSort(right)]; }',
                'interface User { id: number; name: string; email: string; } class UserService { private users: User[] = []; public addUser(user: User): void { this.users.push(user); } public findUser(id: number): User | undefined { return this.users.find(u => u.id === id); } }'
            ],
            [DifficultyLevel.ADVANCED]: [
                'public class AVLTree<T extends Comparable<T>> { private Node<T> root; private static class Node<T> { T data; Node<T> left, right; int height; Node(T data) { this.data = data; this.height = 1; } } public void insert(T data) { root = insert(root, data); } private Node<T> insert(Node<T> node, T data) { if (node == null) return new Node<>(data); if (data.compareTo(node.data) < 0) node.left = insert(node.left, data); else if (data.compareTo(node.data) > 0) node.right = insert(node.right, data); else return node; node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right)); return balance(node); } }',
                'template<typename T> class ThreadSafeQueue { private: mutable std::mutex m; std::queue<T> data_queue; std::condition_variable data_cond; public: void push(T item) { std::lock_guard<std::mutex> lk(m); data_queue.push(item); data_cond.notify_one(); } void pop(T& item) { std::unique_lock<std::mutex> lk(m); while(data_queue.empty()) { data_cond.wait(lk); } item = data_queue.front(); data_queue.pop(); } };'
            ],
            [DifficultyLevel.EXPERT]: [
                'template<typename Key, typename Value, std::size_t N = 16> class LockFreeHashMap { private: struct Node { std::atomic<Key> key; std::atomic<Value> value; std::atomic<Node*> next; Node() : key{}, value{}, next{nullptr} {} }; alignas(64) std::array<std::atomic<Node*>, N> buckets; std::atomic<std::size_t> size; static constexpr std::size_t hash(const Key& k) { return std::hash<Key>{}(k) % N; } public: bool insert(const Key& key, const Value& value) { auto bucket_idx = hash(key); Node* new_node = new Node{}; new_node->key.store(key, std::memory_order_relaxed); new_node->value.store(value, std::memory_order_relaxed); Node* expected = buckets[bucket_idx].load(std::memory_order_acquire); do { new_node->next.store(expected, std::memory_order_relaxed); } while (!buckets[bucket_idx].compare_exchange_weak(expected, new_node, std::memory_order_release, std::memory_order_relaxed)); size.fetch_add(1, std::memory_order_relaxed); return true; } };',
                'constexpr auto fibonacci = [](auto&& self, std::size_t n) -> std::size_t { if constexpr (requires { std::integral_constant<std::size_t, n>{}; }) { if constexpr (n <= 1) return n; else return self(self, std::integral_constant<std::size_t, n-1>{}) + self(self, std::integral_constant<std::size_t, n-2>{}); } else { return n <= 1 ? n : self(self, n-1) + self(self, n-2); } }; template<std::size_t N> requires (N < 50) constexpr auto fib_v = fibonacci(fibonacci, std::integral_constant<std::size_t, N>{});'
            ]
        };

        // 英文文本模板
        const englishTexts = {
            [DifficultyLevel.BEGINNER]: [
                'The quick brown fox jumps over the lazy dog.',
                'Practice makes perfect when learning to type.',
                'Good typing skills are essential in the digital age.',
                'Accuracy is more important than speed when starting out.',
                'Regular practice will improve your typing abilities.'
            ],
            [DifficultyLevel.INTERMEDIATE]: [
                'In computer science, algorithms are step-by-step procedures for solving problems. They form the foundation of programming and software development, requiring logical thinking and mathematical precision.',
                'Machine learning has revolutionized how we approach data analysis. From neural networks to decision trees, these technologies enable computers to learn patterns and make predictions without explicit programming.',
                'The internet has transformed global communication, enabling instant information sharing across continents. Social media platforms, email systems, and video conferencing have created new ways for people to connect.'
            ],
            [DifficultyLevel.ADVANCED]: [
                'Quantum computing represents a paradigm shift in computational capability, leveraging quantum mechanical phenomena such as superposition and entanglement to process information in fundamentally different ways than classical computers. This technology promises to solve complex problems in cryptography, optimization, and simulation that are currently intractable for conventional systems.',
                'Artificial intelligence ethics encompasses the moral considerations surrounding the development and deployment of AI systems. Key concerns include algorithmic bias, privacy preservation, transparency in decision-making processes, and the potential societal impacts of automation on employment and human agency.'
            ],
            [DifficultyLevel.EXPERT]: [
                'The epistemological foundations of computational complexity theory rest upon the mathematical formalization of algorithmic efficiency through asymptotic analysis, wherein the fundamental question of whether P equals NP represents not merely a technical curiosity but a profound inquiry into the computational tractability of problems that exhibit exponential solution spaces yet possess polynomial-time verifiable solutions, thereby bridging abstract mathematical theory with practical implications for cryptography, optimization, and the philosophical limits of mechanical computation.',
                'Contemporary neuromorphic computing architectures attempt to emulate the parallel processing capabilities of biological neural networks through the implementation of spiking neural networks on specialized hardware substrates, incorporating memristive devices that exhibit synaptic plasticity characteristics, thereby enabling energy-efficient computation paradigms that fundamentally challenge the von Neumann bottleneck while simultaneously raising questions about the convergence of artificial and biological intelligence in terms of both computational efficiency and emergent cognitive capabilities.'
            ]
        };

        // 中文文本模板
        const chineseTexts = {
            [DifficultyLevel.BEGINNER]: [
                '学而时习之，不亦说乎？',
                '工欲善其事，必先利其器。',
                '熟能生巧，练习是提高打字速度的关键。',
                '打字是现代生活的基本技能。',
                '准确率比速度更重要。'
            ],
            [DifficultyLevel.INTERMEDIATE]: [
                '计算机科学是研究计算系统、算法和计算过程的学科。它涵盖了从理论基础到实际应用的广泛领域，包括软件工程、人工智能、数据结构等多个分支。',
                '互联网技术的发展改变了人们的生活方式。从电子商务到在线教育，从社交媒体到远程办公，数字化转型正在重塑现代社会的各个方面。',
                '编程语言是人与计算机沟通的桥梁。不同的编程语言有其特定的语法规则和应用场景，掌握多种编程语言有助于提高编程能力和解决问题的效率。'
            ],
            [DifficultyLevel.ADVANCED]: [
                '人工智能的发展正在深刻影响着人类社会的发展进程。从机器学习到深度学习，从自然语言处理到计算机视觉，AI技术在医疗诊断、自动驾驶、智能制造等领域展现出巨大的应用潜力。然而，AI技术的发展也带来了诸多挑战，包括数据隐私保护、算法公平性、就业结构变化以及伦理道德等问题。',
                '区块链技术作为一种分布式账本技术，具有去中心化、不可篡改、透明可追溯等特点。它不仅催生了加密货币这一新兴金融形态，还在供应链管理、数字身份认证、智能合约等领域展现出广阔的应用前景。然而，区块链技术在能源消耗、扩展性、监管合规等方面仍面临着诸多技术和制度层面的挑战。'
            ],
            [DifficultyLevel.EXPERT]: [
                '量子计算作为基于量子力学原理的新型计算模式，通过量子叠加态、量子纠缠、量子测量等物理现象实现并行计算，在理论上能够对某些特定问题提供指数级的计算加速能力。量子算法如Shor分解算法、Grover搜索算法等展现出在密码学破解、数据库搜索、化学分子模拟等领域的巨大潜力。然而，量子计算机的物理实现面临着量子退相干、量子纠错、可扩展性等诸多技术挑战，需要在超低温环境下运行，且当前的量子比特数量和保真度仍然有限。',
                '认知科学与计算机科学的交叉融合催生了神经符号人工智能这一新兴研究领域，试图将基于符号逻辑的推理系统与基于统计学习的神经网络模型相结合，以实现既具备神经网络强大的模式识别能力，又具备符号系统可解释性和逻辑推理能力的混合智能系统。这种融合涉及知识表示、推理机制、学习算法、认知架构等多个层面的深度整合，旨在构建更加类人的人工智能系统，但在知识获取、符号接地、系统集成等方面仍存在诸多理论和实践难题。'
            ]
        };

        // 存储模板到内存中
        this.storeTextTemplates('programming', programmingTexts);
        this.storeTextTemplates('english', englishTexts);
        this.storeTextTemplates('chinese', chineseTexts);
    }

    /**
     * 存储文本模板
     */
    private storeTextTemplates(type: string, texts: Record<DifficultyLevel, string[]>): void {
        Object.entries(texts).forEach(([difficulty, textArray]) => {
            const key = `${type}_${difficulty}`;
            const templates: TextTemplate[] = textArray.map((content, index) => ({
                id: `${key}_${index}`,
                name: `${type} ${difficulty} ${index + 1}`,
                content,
                difficulty: difficulty as DifficultyLevel,
                type: type as TextType,
                language: type === 'chinese' ? 'zh' : 'en',
                tags: [type, difficulty],
                length: content.length,
                estimatedTime: Math.ceil(content.length / 5 / 20 * 60), // 假设20WPM基础速度
                createdAt: new Date(),
                isActive: true
            }));
            
            this.textTemplates.set(key, templates);
        });
    }

    /**
     * 根据条件生成练习文本
     */
    public generateText(
        difficulty: DifficultyLevel = DifficultyLevel.BEGINNER,
        type: TextType = TextType.ENGLISH,
        customText?: string
    ): string {
        // 如果提供了自定义文本，直接返回
        if (customText && customText.trim()) {
            return customText.trim();
        }

        // 从模板库中选择文本
        const key = `${type}_${difficulty}`;
        const templates = this.textTemplates.get(key);
        
        if (!templates || templates.length === 0) {
            // 如果没有找到对应模板，返回默认文本
            return this.getDefaultText(difficulty);
        }

        // 随机选择一个模板
        const randomIndex = Math.floor(Math.random() * templates.length);
        const selectedTemplate = templates[randomIndex];
        
        return selectedTemplate.content;
    }

    /**
     * 获取默认文本
     */
    private getDefaultText(difficulty: DifficultyLevel): string {
        const defaultTexts = {
            [DifficultyLevel.BEGINNER]: 'The quick brown fox jumps over the lazy dog.',
            [DifficultyLevel.INTERMEDIATE]: 'Practice makes perfect. Regular typing practice will improve your speed and accuracy over time.',
            [DifficultyLevel.ADVANCED]: 'Advanced typing requires consistent practice and focus on accuracy rather than just speed. Developing muscle memory through repetitive exercises is key to achieving high performance.',
            [DifficultyLevel.EXPERT]: 'Expert-level typing combines exceptional speed with near-perfect accuracy. This requires years of dedicated practice and the ability to maintain consistency under pressure.'
        };

        return defaultTexts[difficulty] || defaultTexts[DifficultyLevel.BEGINNER];
    }

    /**
     * 获取指定类型和难度的所有文本模板
     */
    public getTextTemplates(type: TextType, difficulty: DifficultyLevel): TextTemplate[] {
        const key = `${type}_${difficulty}`;
        return this.textTemplates.get(key) || [];
    }

    /**
     * 根据长度限制生成文本
     */
    public generateTextByLength(
        minLength: number,
        maxLength: number = this.config.maxTextLength,
        difficulty: DifficultyLevel = DifficultyLevel.BEGINNER,
        type: TextType = TextType.ENGLISH
    ): string {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const text = this.generateText(difficulty, type);
            if (text.length >= minLength && text.length <= maxLength) {
                return text;
            }
            attempts++;
        }
        
        // 如果无法找到合适长度的文本，截取或扩展默认文本
        const defaultText = this.getDefaultText(difficulty);
        if (defaultText.length > maxLength) {
            return defaultText.substring(0, maxLength);
        } else if (defaultText.length < minLength) {
            // 重复文本直到达到最小长度
            let repeatedText = defaultText;
            while (repeatedText.length < minLength) {
                repeatedText += ' ' + defaultText;
            }
            return repeatedText.substring(0, maxLength);
        }
        
        return defaultText;
    }

    /**
     * 验证文本内容
     */
    public validateText(text: string): { valid: boolean; issues: string[] } {
        const issues: string[] = [];
        
        if (!text || text.trim().length === 0) {
            issues.push('文本不能为空');
        }
        
        if (text.length > this.config.maxTextLength) {
            issues.push(`文本长度不能超过 ${this.config.maxTextLength} 个字符`);
        }
        
        if (text.length < 10) {
            issues.push('文本长度不能少于 10 个字符');
        }
        
        // 检查是否包含不适当的字符
        const invalidChars = /[^\w\s\u4e00-\u9fff.,;:!?'"(){}[\]<>=+\-*/%&|^~`#@$\\]/g;
        if (invalidChars.test(text)) {
            issues.push('文本包含不支持的特殊字符');
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * 分析文本难度
     */
    public analyzeTextDifficulty(text: string): {
        estimatedDifficulty: DifficultyLevel;
        metrics: {
            averageWordLength: number;
            specialCharCount: number;
            uniqueCharCount: number;
            complexityScore: number;
        }
    } {
        const words = text.split(/\s+/);
        const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        
        // 计算特殊字符数量
        const specialChars = text.match(/[^a-zA-Z0-9\s\u4e00-\u9fff]/g) || [];
        const specialCharCount = specialChars.length;
        
        // 计算唯一字符数量
        const uniqueChars = new Set(text.toLowerCase()).size;
        
        // 计算复杂度分数
        let complexityScore = 0;
        complexityScore += averageWordLength * 2;
        complexityScore += specialCharCount * 3;
        complexityScore += uniqueChars * 0.5;
        complexityScore += text.length * 0.01;
        
        // 根据复杂度分数判断难度
        let estimatedDifficulty: DifficultyLevel;
        if (complexityScore < 50) {
            estimatedDifficulty = DifficultyLevel.BEGINNER;
        } else if (complexityScore < 100) {
            estimatedDifficulty = DifficultyLevel.INTERMEDIATE;
        } else if (complexityScore < 150) {
            estimatedDifficulty = DifficultyLevel.ADVANCED;
        } else {
            estimatedDifficulty = DifficultyLevel.EXPERT;
        }
        
        return {
            estimatedDifficulty,
            metrics: {
                averageWordLength,
                specialCharCount,
                uniqueCharCount,
                complexityScore
            }
        };
    }

    /**
     * 获取推荐文本
     */
    public getRecommendedText(
        userStats?: { averageWPM: number; averageAccuracy: number; level: number }
    ): { text: string; difficulty: DifficultyLevel; type: TextType; reason: string } {
        if (!userStats) {
            return {
                text: this.generateText(DifficultyLevel.BEGINNER, TextType.ENGLISH),
                difficulty: DifficultyLevel.BEGINNER,
                type: TextType.ENGLISH,
                reason: '新用户推荐从基础文本开始'
            };
        }
        
        let recommendedDifficulty: DifficultyLevel;
        let recommendedType: TextType = TextType.ENGLISH;
        let reason: string;
        
        // 根据用户统计推荐难度
        if (userStats.averageWPM >= 80 && userStats.averageAccuracy >= 95) {
            recommendedDifficulty = DifficultyLevel.EXPERT;
            reason = '基于您的高速度和高准确率，推荐专家级文本';
        } else if (userStats.averageWPM >= 60 && userStats.averageAccuracy >= 90) {
            recommendedDifficulty = DifficultyLevel.ADVANCED;
            reason = '您的打字水平已达到高级，推荐高级文本挑战';
        } else if (userStats.averageWPM >= 40 && userStats.averageAccuracy >= 85) {
            recommendedDifficulty = DifficultyLevel.INTERMEDIATE;
            reason = '基于您的进步情况，推荐中级难度文本';
        } else {
            recommendedDifficulty = DifficultyLevel.BEGINNER;
            reason = '建议继续练习基础文本以提高准确率';
        }
        
        // 根据用户等级推荐文本类型
        if (userStats.level >= 10) {
            recommendedType = TextType.PROGRAMMING;
            reason += '，编程文本有助于提升技术打字能力';
        } else if (userStats.level >= 5) {
            recommendedType = Math.random() > 0.5 ? TextType.ENGLISH : TextType.PROGRAMMING;
            reason += '，建议尝试多种文本类型';
        }
        
        return {
            text: this.generateText(recommendedDifficulty, recommendedType),
            difficulty: recommendedDifficulty,
            type: recommendedType,
            reason
        };
    }
}