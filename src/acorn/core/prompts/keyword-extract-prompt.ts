import { PromptTemplate } from "../prompt/prompt";

export const keywordExtractPrompt = new PromptTemplate({
  templateVars: ["query"],
  template: `Identify high-level and low-level keywords from a given query. High-level keywords should focus on general concepts or themes, while low-level keywords should focus on specific entities, details, or terms.

# Steps
1. Analyze the query to understand the main topic or theme.
2. Determine high-level keywords that represent the overall concept or theme of the query.
3. Identify low-level keywords that focus on specific entities or detailed terms related to the query.
4. Output the findings in a structured JSON format.

# Output Format

- Provide the output in JSON format with two keys:
  - "high_level_keywords": An array of high-level keywords.
  - "low_level_keywords": An array of low-level keywords.

# Examples

**Example 1:**
- Query: "国际贸易如何影响全球经济稳定性？"
- Output:
  {
    "high_level_keywords": ["国际贸易", "全球经济稳定性", "经济影响"],
    "low_level_keywords": ["贸易协定", "关税", "货币汇率", "进口", "出口"]
  }

**Example 2:**
- Query: "森林砍伐对生物多样性有什么环境影响？"
- Output: 
  {
    "high_level_keywords": ["环境影响", "森林砍伐", "生物多样性丧失"],
    "low_level_keywords": ["物种灭绝", "栖息地破坏", "碳排放", "热带雨林", "生态系统"]
  }

**Example 3:**
- Query: "教育在减少贫困方面扮演什么角色？"
- Output:
  {
    "high_level_keywords": ["教育", "减少贫困", "社会经济发展"],
    "low_level_keywords": ["教育机会", "识字率", "职业培训", "收入不平等"]
  }

**Example 4:**
- Query: "你好",
- Output:
  null

# Notes

- Ensure that the keywords are relevant and accurately reflect the content and intent of the query.
- Consider the context and nuances of the query to identify the most appropriate keywords.,
- 如果只是简单的问候语句，你需要返回null

# Real Data
Query: {query}
Output:
`,
});
