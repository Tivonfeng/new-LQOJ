const fs = require('fs');
const path = require('path');

function checkYamlFormat(filePath) {
    console.log(`\n检查文件: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const errors = [];
        const warnings = [];
        
        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const line = lines[i];
            const trimmed = line.trim();
            
            // 跳过空行和注释
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // 检查键值对格式
            if (trimmed.includes(':')) {
                const colonIndex = trimmed.indexOf(':');
                
                // 检查冒号后是否有空格
                if (colonIndex < trimmed.length - 1 && trimmed[colonIndex + 1] !== ' ') {
                    errors.push(`行 ${lineNum}: 冒号后缺少空格 - "${trimmed}"`);
                    continue;
                }
                
                const key = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();
                
                // 检查键的格式
                if (!key) {
                    errors.push(`行 ${lineNum}: 键为空`);
                    continue;
                }
                
                // 检查值的引号平衡 (只检查值部分，不包括可能的引号包围)
                if (value) {
                    // 如果值被引号包围，检查内部引号是否平衡
                    let valueContent = value;
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        valueContent = value.slice(1, -1);
                    }
                    
                    const doubleQuotes = (valueContent.match(/"/g) || []).length;
                    const singleQuotes = (valueContent.match(/'/g) || []).length;
                    
                    if (doubleQuotes % 2 !== 0) {
                        errors.push(`行 ${lineNum}: 值内部双引号不平衡 - "${trimmed}"`);
                    }
                    
                    if (singleQuotes % 2 !== 0) {
                        errors.push(`行 ${lineNum}: 值内部单引号不平衡 - "${trimmed}"`);
                    }
                    
                    // 检查包含中文标点的值是否被引号包围
                    const chinesePunctuation = /[，。！？：；""''（）]/;
                    if (chinesePunctuation.test(value) && !value.startsWith('"') && !value.startsWith("'")) {
                        warnings.push(`行 ${lineNum}: 建议将包含中文标点的值用引号包围 - "${trimmed}"`);
                    }
                }
            } else if (trimmed.length > 0) {
                warnings.push(`行 ${lineNum}: 可能的格式问题 - "${trimmed}"`);
            }
        }
        
        // 检查重复键
        const keys = [];
        const duplicateKeys = new Set();
        
        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || !trimmed.includes(':')) return;
            
            const colonIndex = trimmed.indexOf(':');
            const key = trimmed.substring(0, colonIndex).trim();
            
            if (keys.includes(key)) {
                duplicateKeys.add(key);
                errors.push(`行 ${i + 1}: 重复的键 "${key}"`);
            } else {
                keys.push(key);
            }
        });
        
        // 输出结果
        if (errors.length > 0) {
            console.log('❌ 发现错误:');
            errors.forEach(error => console.log(`  ${error}`));
        }
        
        if (warnings.length > 0) {
            console.log('⚠️  警告:');
            warnings.forEach(warning => console.log(`  ${warning}`));
        }
        
        if (errors.length === 0) {
            if (warnings.length === 0) {
                console.log('✅ YAML格式完全正确!');
            } else {
                console.log(`✅ YAML格式基本正确 (${warnings.length} 个警告)`);
            }
            return true;
        } else {
            console.log(`❌ YAML格式有问题 (${errors.length} 个错误, ${warnings.length} 个警告)`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ 读取文件失败: ${error.message}`);
        return false;
    }
}

// 检查两个YAML文件
console.log('🔍 检查多语言YAML文件格式...\n');

const zhPath = path.join(__dirname, 'locales', 'zh.yaml');
const enPath = path.join(__dirname, 'locales', 'en.yaml');

const zhValid = checkYamlFormat(zhPath);
const enValid = checkYamlFormat(enPath);

console.log('\n📊 总结:');
if (zhValid && enValid) {
    console.log('✅ 所有YAML文件格式都正确!');
    process.exit(0);
} else {
    console.log('❌ 部分YAML文件有格式问题，需要修复');
    process.exit(1);
}