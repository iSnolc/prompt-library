export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // CORS 处理
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // 处理GET请求 - 获取所有提示词
  if (method === "GET") {
    try {
      const data = await env.PROMPTS_KV.get("all_prompts");

      if (data) {
        return new Response(data, { headers });
      }

      // KV中没有数据，返回默认数据
      const defaultData = JSON.stringify([
        {
          id: 1,
          title: "AI写作助手",
          tags: ["写作", "AI"],
          preview: "请帮我用以下风格改进这段文字：简洁、专业、引人入胜...",
          content:
            "请帮我用以下风格改进这段文字：\n\n风格要求：\n1. 简洁明了\n2. 专业但不生硬\n3. 引人入胜\n4. 易于理解\n\n请提供改进版本并说明改进之处。",
        },
        {
          id: 2,
          title: "代码审查专家",
          tags: ["代码", "审查"],
          preview: "请审查以下代码，指出问题并提供改进建议...",
          content:
            "请您作为一名资深代码审查员，审查以下代码：\n\n审查重点：\n1. 代码质量和可读性\n2. 潜在的性能问题\n3. 安全隐患\n4. 最佳实践\n5. 可维护性\n\n请提供详细的改进建议。",
        },
        {
          id: 3,
          title: "产品文案撰写",
          tags: ["营销", "文案"],
          preview: "为我的产品写一个引人注目的营销文案...",
          content:
            "请为我的产品写一个吸引人的营销文案。\n\n产品信息：\n- 产品名称：\n- 主要特点：\n- 目标用户：\n- 核心价值：\n\n文案要求：\n1. 突出产品优势\n2. 触发用户需求\n3. 包含行动号召\n4. 字数在100-200字",
        },
        {
          id: 4,
          title: "学习计划制定",
          tags: ["教育", "计划"],
          preview: "为我制定一个系统的学习计划...",
          content:
            "请为我制定一个30天的学习计划。\n\n学习信息：\n- 学习科目：\n- 当前水平：\n- 学习目标：\n- 每日可用时间：\n\n计划要求：\n1. 分阶段目标\n2. 具体学习资源\n3. 每日任务清单\n4. 评估方法",
        },
        {
          id: 5,
          title: "数据分析报告",
          tags: ["分析", "数据"],
          preview: "帮我分析数据并生成洞察...",
          content:
            "请帮我分析以下数据并生成商业洞察。\n\n数据信息：\n- 数据类型：\n- 数据范围：\n- 关键指标：\n- 业务背景：\n\n分析要求：\n1. 趋势分析\n2. 关键发现\n3. 潜在原因\n4. 优化建议",
        },
        {
          id: 6,
          title: "内容创意生成",
          tags: ["创意", "内容"],
          preview: "为我的内容生成创意想法...",
          content:
            "请为我生成5个创意内容想法。\n\n背景信息：\n- 内容类型：\n- 目标受众：\n- 品牌调性：\n- 核心消息：\n\n要求：\n1. 创意新颖\n2. 可执行性强\n3. 与品牌一致\n4. 包含内容形式建议",
        },
      ]);

      // 保存到KV
      await env.PROMPTS_KV.put("all_prompts", defaultData);

      return new Response(defaultData, { headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }
  }

  // 处理POST请求 - 保存提示词
  if (method === "POST") {
    try {
      const data = await request.text();
      await env.PROMPTS_KV.put("all_prompts", data);
      return new Response(JSON.stringify({ success: true }), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers });
}
