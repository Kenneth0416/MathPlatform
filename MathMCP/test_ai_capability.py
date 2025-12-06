#!/usr/bin/env python3
"""
MCP 工具調用能力測試腳本
用於驗證 MCP 服務器的所有功能是否正常工作
"""

import asyncio
import json
from mcp_math.mcp_server import MCPServer


class TestResult:
    def __init__(self, test_id, description, score, max_score, status, notes=""):
        self.test_id = test_id
        self.description = description
        self.score = score
        self.max_score = max_score
        self.status = status
        self.notes = notes


async def run_test_suite():
    server = MCPServer()
    results = []
    
    print("=" * 80)
    print(" " * 20 + "MCP 工具調用能力測試套件")
    print("=" * 80)
    print()
    
    # Level 1: 基礎測試
    print("📋 Level 1: 基礎測試")
    print("-" * 80)
    
    # 測試 1.1：簡單一次方程
    print("\n測試 1.1：簡單一次方程")
    print("問題：2x + 3 = 11")
    try:
        result = await server.call_tool('algebra_solve', {
            'eq': '2*x+3=11',
            'var': 'x'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            if 'x = 4' in str(data['result']) or '4' in str(data['result'].get('solutions', [])):
                print("✅ 通過（5/5）")
                results.append(TestResult("1.1", "簡單方程", 5, 5, "✅", "正確"))
            else:
                print(f"⚠️ 答案錯誤（3/5）：{data['result']}")
                results.append(TestResult("1.1", "簡單方程", 3, 5, "⚠️", "答案錯誤"))
        else:
            print("❌ 工具調用失敗（0/5）")
            results.append(TestResult("1.1", "簡單方程", 0, 5, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/5）：{str(e)[:50]}")
        results.append(TestResult("1.1", "簡單方程", 0, 5, "❌", str(e)[:30]))
    
    # 測試 1.2：勾股定理
    print("\n測試 1.2：勾股定理")
    print("問題：已知直角邊 3 和 4，求斜邊")
    try:
        result = await server.call_tool('geometry_pythagoras', {
            'known': 'legs',
            'a': 3,
            'b': 4
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            if '5' in str(data['result'].get('approx')) or 'c = 5' in str(data['result']):
                print("✅ 通過（5/5）")
                results.append(TestResult("1.2", "勾股定理", 5, 5, "✅", "正確"))
            else:
                print(f"⚠️ 答案錯誤（3/5）：{data['result']}")
                results.append(TestResult("1.2", "勾股定理", 3, 5, "⚠️", "答案錯誤"))
        else:
            print("❌ 工具調用失敗（0/5）")
            results.append(TestResult("1.2", "勾股定理", 0, 5, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/5）：{str(e)[:50]}")
        results.append(TestResult("1.2", "勾股定理", 0, 5, "❌", str(e)[:30]))
    
    # 測試 1.3：簡單不等式
    print("\n測試 1.3：簡單不等式")
    print("問題：2x + 3 >= 7")
    try:
        result = await server.call_tool('algebra_inequality', {
            'ineq': '2*x+3 >= 7',
            'var': 'x'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            result_str = str(data['result'])
            if '2' in result_str or 'Interval(2' in result_str:
                print("✅ 通過（5/5）")
                results.append(TestResult("1.3", "簡單不等式", 5, 5, "✅", "正確"))
            else:
                print(f"⚠️ 答案可能錯誤（3/5）：{data['result']}")
                results.append(TestResult("1.3", "簡單不等式", 3, 5, "⚠️", "答案待確認"))
        else:
            print("❌ 工具調用失敗（0/5）")
            results.append(TestResult("1.3", "簡單不等式", 0, 5, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/5）：{str(e)[:50]}")
        results.append(TestResult("1.3", "簡單不等式", 0, 5, "❌", str(e)[:30]))
    
    # 測試 1.4：組合數
    print("\n測試 1.4：組合數")
    print("問題：C(8,3)")
    try:
        result = await server.call_tool('combinatorics_ncr', {
            'n': 8,
            'r': 3
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            if data['result'].get('exact') == 56:
                print("✅ 通過（5/5）")
                results.append(TestResult("1.4", "組合數", 5, 5, "✅", "正確"))
            else:
                print(f"⚠️ 答案錯誤（2/5）：{data['result']}")
                results.append(TestResult("1.4", "組合數", 2, 5, "⚠️", "答案錯誤"))
        else:
            print("❌ 工具調用失敗（0/5）")
            results.append(TestResult("1.4", "組合數", 0, 5, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/5）：{str(e)[:50]}")
        results.append(TestResult("1.4", "組合數", 0, 5, "❌", str(e)[:30]))
    
    # Level 2: 中等測試
    print("\n" + "=" * 80)
    print("📋 Level 2: 中等測試")
    print("-" * 80)
    
    # 測試 2.1：相似三角形（最關鍵！）
    print("\n測試 2.1：相似三角形 ⭐ 關鍵測試")
    print("問題：△ABC與△A'B'C'對應，AC=8，A'C'=12，AB=6，求A'B'")
    try:
        result = await server.call_tool('geometry_similar_triangles', {
            'side1_name': 'AC',
            'side1_length': 8,
            'side2_name': "A'C'",
            'side2_length': 12,
            'known_side_name': 'AB',
            'known_side_length': 6,
            'query_side_name': "A'B'"
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            if '9' in str(data['result'].get('approx')) or "A'B' = 9" in str(data['result']):
                print("✅ 通過（8/8）")
                results.append(TestResult("2.1", "相似三角形", 8, 8, "✅", "正確"))
            else:
                print(f"⚠️ 答案錯誤（4/8）：{data['result']}")
                results.append(TestResult("2.1", "相似三角形", 4, 8, "⚠️", "答案錯誤"))
        else:
            print("❌ 工具調用失敗（2/8）- 可能選錯工具")
            results.append(TestResult("2.1", "相似三角形", 2, 8, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/8）：{str(e)[:50]}")
        results.append(TestResult("2.1", "相似三角形", 0, 8, "❌", str(e)[:30]))
    
    # 測試 2.2：圓角度
    print("\n測試 2.2：圓心角與圓周角")
    print("問題：圓心角 120°，求圓周角")
    try:
        result = await server.call_tool('geometry_circle_angles', {
            'query': 'inscribed',
            'center_angle': 120
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            if '60' in str(data['result']):
                print("✅ 通過（6/6）")
                results.append(TestResult("2.2", "圓角度", 6, 6, "✅", "正確"))
            else:
                print(f"⚠️ 答案錯誤（3/6）：{data['result']}")
                results.append(TestResult("2.2", "圓角度", 3, 6, "⚠️", "答案錯誤"))
        else:
            print("❌ 工具調用失敗（0/6）")
            results.append(TestResult("2.2", "圓角度", 0, 6, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/6）：{str(e)[:50]}")
        results.append(TestResult("2.2", "圓角度", 0, 6, "❌", str(e)[:30]))
    
    # 測試 2.3：二次方程
    print("\n測試 2.3：二次方程")
    print("問題：x^2 - 5x + 6 = 0")
    try:
        result = await server.call_tool('algebra_solve', {
            'eq': 'x^2-5*x+6=0',
            'var': 'x'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            solutions = str(data['result'].get('solutions', []))
            if ('2' in solutions and '3' in solutions) or ('x = 2' in str(data['result']) and 'x = 3' in str(data['result'])):
                print("✅ 通過（8/8）")
                results.append(TestResult("2.3", "二次方程", 8, 8, "✅", "正確"))
            else:
                print(f"⚠️ 答案可能錯誤（4/8）：{data['result']}")
                results.append(TestResult("2.3", "二次方程", 4, 8, "⚠️", "答案待確認"))
        else:
            print("❌ 工具調用失敗（2/8）")
            results.append(TestResult("2.3", "二次方程", 2, 8, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/8）：{str(e)[:50]}")
        results.append(TestResult("2.3", "二次方程", 0, 8, "❌", str(e)[:30]))
    
    # 測試 2.4：分式不等式
    print("\n測試 2.4：分式不等式")
    print("問題：(x-3)/(x+1) > 0")
    try:
        result = await server.call_tool('algebra_inequality', {
            'ineq': '(x-3)/(x+1) > 0',
            'var': 'x'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            result_str = str(data['result'])
            # 檢查是否包含正確的區間
            if ('-1' in result_str and '3' in result_str) or 'Union' in result_str:
                print("✅ 通過（8/8）")
                results.append(TestResult("2.4", "分式不等式", 8, 8, "✅", "正確"))
            else:
                print(f"⚠️ 答案可能錯誤（4/8）：{data['result']}")
                results.append(TestResult("2.4", "分式不等式", 4, 8, "⚠️", "答案待確認"))
        else:
            print("❌ 工具調用失敗（0/8）")
            results.append(TestResult("2.4", "分式不等式", 0, 8, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/8）：{str(e)[:50]}")
        results.append(TestResult("2.4", "分式不等式", 0, 8, "❌", str(e)[:30]))
    
    # Level 3: 進階測試
    print("\n" + "=" * 80)
    print("📋 Level 3: 進階測試")
    print("-" * 80)
    
    # 測試 3.1：化簡表達式
    print("\n測試 3.1：化簡表達式")
    print("問題：化簡 (x+1)^2 - (x-1)^2")
    try:
        result = await server.call_tool('algebra_simplify', {
            'expr': '(x+1)**2 - (x-1)**2'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            result_str = str(data['result']['exact']).replace(' ', '').lower()
            if '4*x' in result_str or '4x' in result_str:
                print("✅ 通過（7/7）")
                results.append(TestResult("3.1", "化簡表達式", 7, 7, "✅", "正確"))
            else:
                print(f"⚠️ 答案可能錯誤（4/7）：{data['result']}")
                results.append(TestResult("3.1", "化簡表達式", 4, 7, "⚠️", "答案待確認"))
        else:
            print("❌ 工具調用失敗（0/7）")
            results.append(TestResult("3.1", "化簡表達式", 0, 7, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/7）：{str(e)[:50]}")
        results.append(TestResult("3.1", "化簡表達式", 0, 7, "❌", str(e)[:30]))
    
    # 測試 3.2：因式分解
    print("\n測試 3.2：因式分解")
    print("問題：因式分解 x^2 - 5x + 6")
    try:
        result = await server.call_tool('algebra_factor', {
            'expr': 'x**2-5*x+6'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            result_str = str(data['result']['exact'])
            if '(x - 2)' in result_str and '(x - 3)' in result_str:
                print("✅ 通過（7/7）")
                results.append(TestResult("3.2", "因式分解", 7, 7, "✅", "正確"))
            else:
                print(f"⚠️ 答案可能錯誤（4/7）：{data['result']}")
                results.append(TestResult("3.2", "因式分解", 4, 7, "⚠️", "答案待確認"))
        else:
            print("❌ 工具調用失敗（0/7）")
            results.append(TestResult("3.2", "因式分解", 0, 7, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/7）：{str(e)[:50]}")
        results.append(TestResult("3.2", "因式分解", 0, 7, "❌", str(e)[:30]))
    
    # 測試 3.3：展開表達式
    print("\n測試 3.3：展開表達式")
    print("問題：展開 (x+1)(x+2)")
    try:
        result = await server.call_tool('algebra_expand', {
            'expr': '(x+1)*(x+2)'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            result_str = str(data['result']['exact']).replace(' ', '')
            if 'x**2' in result_str and '3*x' in result_str and '2' in result_str:
                print("✅ 通過（7/7）")
                results.append(TestResult("3.3", "展開表達式", 7, 7, "✅", "正確"))
            else:
                print(f"⚠️ 答案可能錯誤（4/7）：{data['result']}")
                results.append(TestResult("3.3", "展開表達式", 4, 7, "⚠️", "答案待確認"))
        else:
            print("❌ 工具調用失敗（0/7）")
            results.append(TestResult("3.3", "展開表達式", 0, 7, "❌", "工具失敗"))
    except Exception as e:
        print(f"❌ 異常（0/7）：{str(e)[:50]}")
        results.append(TestResult("3.3", "展開表達式", 0, 7, "❌", str(e)[:30]))
    
    # 測試 3.4：Unicode 字符支持
    print("\n測試 3.4：Unicode 字符支持")
    print("問題：2×x − 3 = 7（含 Unicode 字符）")
    try:
        result = await server.call_tool('algebra_solve', {
            'eq': '2×x − 3 = 7',
            'var': 'x'
        })
        if not result.get('isError'):
            data = json.loads(result['content'][0]['text'])
            if '5' in str(data['result'].get('solutions', [])) or 'x = 5' in str(data['result']):
                print("✅ 通過（7/7）- Unicode 處理正常")
                results.append(TestResult("3.4", "Unicode支持", 7, 7, "✅", "正確"))
            else:
                print(f"⚠️ 答案錯誤（3/7）：{data['result']}")
                results.append(TestResult("3.4", "Unicode支持", 3, 7, "⚠️", "答案錯誤"))
        else:
            error_data = json.loads(result['content'][0]['text'])
            if 'U+2212' in error_data.get('error', '') or 'U+00D7' in error_data.get('error', ''):
                print("❌ Unicode 轉換失敗（0/7）")
                results.append(TestResult("3.4", "Unicode支持", 0, 7, "❌", "Unicode未轉換"))
            else:
                print("❌ 其他錯誤（2/7）")
                results.append(TestResult("3.4", "Unicode支持", 2, 7, "❌", "其他錯誤"))
    except Exception as e:
        print(f"❌ 異常（0/7）：{str(e)[:50]}")
        results.append(TestResult("3.4", "Unicode支持", 0, 7, "❌", str(e)[:30]))
    
    # 生成報告
    print("\n" + "=" * 80)
    print(" " * 30 + "測試報告")
    print("=" * 80)
    print()
    
    # 按級別統計
    level1_score = sum(r.score for r in results if r.test_id.startswith('1'))
    level1_max = sum(r.max_score for r in results if r.test_id.startswith('1'))
    level2_score = sum(r.score for r in results if r.test_id.startswith('2'))
    level2_max = sum(r.max_score for r in results if r.test_id.startswith('2'))
    level3_score = sum(r.score for r in results if r.test_id.startswith('3'))
    level3_max = sum(r.max_score for r in results if r.test_id.startswith('3'))
    
    total_score = sum(r.score for r in results)
    total_max = sum(r.max_score for r in results)
    
    print(f"📊 分數統計")
    print("-" * 80)
    print(f"Level 1（基礎）：{level1_score}/{level1_max} ({level1_score/level1_max*100:.1f}%)")
    print(f"Level 2（中等）：{level2_score}/{level2_max} ({level2_score/level2_max*100:.1f}%)")
    print(f"Level 3（進階）：{level3_score}/{level3_max} ({level3_score/level3_max*100:.1f}%)")
    print()
    print(f"總分：{total_score}/{total_max} ({total_score/total_max*100:.1f}%)")
    print()
    
    # 評級
    percentage = total_score / total_max * 100
    if percentage >= 95:
        grade = "S級 ⭐⭐⭐⭐⭐"
    elif percentage >= 85:
        grade = "A級 ⭐⭐⭐⭐"
    elif percentage >= 75:
        grade = "B級 ⭐⭐⭐"
    elif percentage >= 65:
        grade = "C級 ⭐⭐"
    elif percentage >= 50:
        grade = "D級 ⭐"
    else:
        grade = "F級 ❌"
    
    print(f"🏆 評級：{grade}")
    print()
    
    # 詳細結果
    print("📋 詳細結果")
    print("-" * 80)
    print(f"{'測試ID':<8} {'描述':<15} {'得分':<10} {'狀態':<6} {'備註'}")
    print("-" * 80)
    for r in results:
        print(f"{r.test_id:<8} {r.description:<15} {r.score}/{r.max_score:<7} {r.status:<6} {r.notes}")
    
    print()
    print("=" * 80)
    
    # 失敗項分析
    failed = [r for r in results if r.score < r.max_score]
    if failed:
        print(f"\n⚠️ 需要改進的項目（{len(failed)} 項）：")
        for r in failed:
            print(f"  - {r.test_id}: {r.description} ({r.score}/{r.max_score}) - {r.notes}")
    else:
        print("\n🎉 所有測試全部通過！")
    
    print()
    print("=" * 80)
    
    return results, total_score, total_max


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║              MCP 數學服務 - 功能測試套件                                  ║
║                                                                          ║
║  此測試驗證 MCP 服務器的所有工具是否正常工作                               ║
║  不是測試 AI 模型（需要在 Cherry Studio 中手動測試）                      ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
    """)
    
    results, score, max_score = asyncio.run(run_test_suite())
    
    print(f"\n最終得分：{score}/{max_score} ({score/max_score*100:.1f}%)")
    
    if score == max_score:
        print("\n🎉 完美！MCP 服務器所有功能正常！")
    elif score / max_score >= 0.9:
        print("\n✅ 優秀！MCP 服務器基本功能正常，少數問題需要修復。")
    elif score / max_score >= 0.7:
        print("\n⚠️ 良好！MCP 服務器大部分功能正常，建議檢查失敗項。")
    else:
        print("\n❌ 需要改進！請檢查失敗的測試項並修復。")


