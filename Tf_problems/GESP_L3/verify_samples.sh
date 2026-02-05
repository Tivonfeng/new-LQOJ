#!/bin/bash

# GESP_L3 样例验证脚本
# 使用标程验证所有题目的样例数据是否正确

BASE_DIR="/Users/tivonfeng/Work/Code/new-LQOJ/Tf_problems/GESP_L3"
PROBLEMS=$(ls -d ${BASE_DIR}/*/ | grep -E "[0-9]{6}/$")

TOTAL_PROBLEMS=0
PASSED=0
FAILED=0

echo "========================================"
echo "GESP_L3 样例验证开始"
echo "========================================"
echo ""

for problem_dir in $PROBLEMS; do
    problem_name=$(basename "$problem_dir")
    solution_file="${problem_dir}solution.cpp"
    testdata_dir="${problem_dir}testdata"
    
    if [ ! -f "$solution_file" ]; then
        echo "[跳过] $problem_name: 缺少 solution.cpp"
        continue
    fi
    
    TOTAL_PROBLEMS=$((TOTAL_PROBLEMS + 1))
    echo "[验证] $problem_name"
    
    # 编译标程
    compile_output=$(g++ -std=c++17 -O2 -o "${problem_dir}solution_exec" "$solution_file" 2>&1)
    if [ $? -ne 0 ]; then
        echo "  [编译失败] $compile_output"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # 检查测试数据文件
    if [ ! -d "$testdata_dir" ]; then
        echo "  [跳过] 缺少 testdata 目录"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # 验证每个测试样例
    problem_passed=true
    
    for i in $(seq 1 10); do
        input_file="${testdata_dir}/${i}.in"
        output_file="${testdata_dir}/${i}.out"
        
        if [ ! -f "$input_file" ] || [ ! -f "$output_file" ]; then
            continue
        fi
        
        # 运行标程
        exec_output=$("${problem_dir}solution_exec" < "$input_file" 2>&1)
        
        # 比较输出（去除末尾空白）
        expected=$(cat "$output_file" | sed 's/[[:space:]]*$//')
        actual=$(echo "$exec_output" | sed 's/[[:space:]]*$//')
        
        if [ "$expected" != "$actual" ]; then
            echo "  [失败] 样例 $i 不匹配"
            echo "    输入:"
            head -3 "$input_file" | sed 's/^/      /'
            echo "    期望: $expected"
            echo "    实际: $actual"
            problem_passed=false
            break
        fi
    done
    
    # 清理编译生成的文件
    rm -f "${problem_dir}solution_exec"
    
    if [ "$problem_passed" = true ]; then
        echo "  [通过] 所有样例验证通过"
        PASSED=$((PASSED + 1))
    else
        FAILED=$((FAILED + 1))
    fi
    echo ""
done

echo "========================================"
echo "验证完成: $TOTAL_PROBLEMS 个题目"
echo "  通过: $PASSED"
echo "  失败: $FAILED"
echo "========================================"

# 如果有失败的题目，返回非零退出码
if [ $FAILED -gt 0 ]; then
    exit 1
fi
exit 0
