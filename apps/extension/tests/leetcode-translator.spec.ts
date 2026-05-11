import { expect, test } from "@playwright/test";
import path from "node:path";

const localizerPath = path.resolve(
  __dirname,
  "../content/leetcode-localizer.js",
);
const problemUrl = "https://leetcode.com/problems/palindrome-number/";
const apiUrl = "https://peekle.test/api/leetcode/translate";
const translationCacheKey = "peekle_leetcode_translation_cache_v1";
const problemHtml = `
  <!doctype html>
  <html>
    <head><title>Palindrome Number - LeetCode</title></head>
    <body>
      <nav id="outside-nav">This navigation must stay English.</nav>
      <aside id="outside-panel">This sidebar must stay English.</aside>
      <main>
        <section data-track-load="description_content">
          <h1>9. Palindrome Number</h1>
          <p>Given an integer <code>x</code>, return <code>true</code> if <code>x</code> is a <span class="cursor-pointer"><button type="button">palindrome</button></span>, and <code>false</code> otherwise.</p>
          <p>Example 1:</p>
          <pre>Input: x = 121
Output: true
Explanation: 121 reads as 121 from left to right and from right to left.</pre>
          <p>Constraints:</p>
          <ul>
            <li>-2^31 &lt;= x &lt;= 2^31 - 1</li>
          </ul>
        </section>
      </main>
    </body>
  </html>
`;
const analysisHtml = `
  <section id="submission-panel">
    <div id="analysis-approach-content">
      <span>Congratulations! You passed on your first attempt. You're in great form today!</span>
      <div>
        <span>핵심 아이디어:</span>
        <span>Iterating through numbers, converting to strings to extract digits, and reconstructing the result array.</span>
      </div>
    </div>
    <div id="analysis-efficiency-content">
      <span>현재 복잡도: </span>
      <span class="katex">O(N log M)</span>
      <span>제안:</span>
      <span>Your solution is already optimal; no further changes are needed.</span>
    </div>
    <div translate="no">
      <pre><code>class Solution {}</code></pre>
    </div>
    <div id="analysis-code-style-content">
      <span>제안:</span>
      <span>This code is exceptionally clean and follows all best practices perfectly.</span>
    </div>
  </section>
`;

function translateStub(text: string) {
  if (text.includes("Given an integer §0§")) {
    return "정수 §0§가 주어지면 §2§가 §3§이면 §1§를 반환하고, 그렇지 않으면 §4§를 반환합니다.";
  }
  if (text.includes("121 reads as 121")) {
    return "121은 왼쪽에서 오른쪽으로, 오른쪽에서 왼쪽으로 읽어도 121입니다.";
  }
  if (text === "Palindrome") {
    return "팰린드롬";
  }
  if (text.includes("reads the same forward and backward")) {
    return "정수가 앞뒤로 똑같이 읽히면 팰린드롬입니다.";
  }
  if (text.includes("For example, §0§")) {
    return "예를 들어 §0§은 팰린드롬이고 §1§은 아닙니다.";
  }
  if (text.includes("Congratulations!")) {
    return "축하합니다! 첫 시도에 통과했습니다. 오늘 컨디션이 아주 좋네요!";
  }
  if (text.includes("Iterating through numbers")) {
    return "숫자를 순회하며 문자열로 변환해 각 자릿수를 추출하고 결과 배열을 다시 구성합니다.";
  }
  if (text.includes("already optimal")) {
    return "이미 최적의 풀이입니다. 추가 변경은 필요하지 않습니다.";
  }
  if (text.includes("exceptionally clean")) {
    return "이 코드는 매우 깔끔하며 모든 모범 사례를 잘 따르고 있습니다.";
  }

  return `번역됨: ${text}`;
}

test("translates only the Palindrome Number problem description through backend", async ({
  page,
}) => {
  const backendCalls: Array<{ texts: string[]; token: string | undefined }> = [];

  await page.addInitScript(() => {
    const storageData: Record<string, unknown> = {
      leetcodeKoreanEnabled: true,
      peekle_token: "test-token",
    };

    Object.defineProperty(window, "__peekleStorageData", {
      configurable: true,
      value: storageData,
    });

    Object.defineProperty(window, "chrome", {
      configurable: true,
      value: {
        runtime: {
          lastError: null,
          sendMessage(
            request: { type?: string },
            callback: (value: Record<string, unknown> | null) => void,
          ) {
            if (request?.type === "CHECK_ENV") {
              callback({ apiUrl: "https://peekle.test" });
              return;
            }
            if (request?.type === "GET_TOKEN") {
              callback({ token: "test-token" });
              return;
            }
            callback(null);
          },
          onMessage: {
            addListener() {},
          },
        },
        storage: {
          local: {
            get(
              _keys: string[],
              callback: (value: Record<string, unknown>) => void,
            ) {
              callback(storageData);
            },
            set(
              items: Record<string, unknown>,
              callback?: () => void,
            ) {
              Object.assign(storageData, items);
              callback?.();
            },
          },
          onChanged: {
            addListener() {},
          },
        },
      },
    });
  });

  await page.route(apiUrl, async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() || "{}") as { texts: string[] };
    backendCalls.push({
      texts: body.texts,
      token: request.headers()["x-peekle-token"],
    });

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          translations: body.texts.map(translateStub),
        },
      }),
    });
  });

  await page.route(problemUrl, async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: problemHtml,
    });
  });

  await page.goto(problemUrl);
  await page.addScriptTag({ path: localizerPath });

  await expect(page.locator("#peekle-problem-translate-button")).toBeVisible();
  await page.locator("#peekle-problem-translate-button").click();

  await expect(page.locator("#peekle-problem-translate-button")).toHaveText(
    "원문 보기",
  );
  await expect(page.locator("#peekle-problem-translation-box")).toHaveCount(0);
  await expect(
    page.locator('[data-track-load="description_content"] p').first(),
  ).toHaveText(
    "정수 x가 주어지면 x가 palindrome이면 true를 반환하고, 그렇지 않으면 false를 반환합니다.",
  );
  await expect(
    page.locator('[data-track-load="description_content"] p').first(),
  ).not.toContainText("__peekle");
  await expect(
    page.locator('[data-track-load="description_content"] p').first(),
  ).not.toContainText("§");
  await expect(
    page.locator('[data-track-load="description_content"] button', {
      hasText: "palindrome",
    }),
  ).toBeVisible();

  const exampleBlock = page.locator(
    '[data-track-load="description_content"] pre',
  );
  await expect(exampleBlock).toContainText("Input: x = 121");
  await expect(exampleBlock).toContainText("Output: true");
  await expect(exampleBlock).toContainText("설명:");
  await expect(exampleBlock).toContainText(
    "121은 왼쪽에서 오른쪽으로, 오른쪽에서 왼쪽으로 읽어도 121입니다.",
  );
  await expect(exampleBlock).not.toContainText("입력:");
  await expect(exampleBlock).not.toContainText("출력:");

  await page.evaluate(() => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-radix-popper-content-wrapper", "");
    wrapper.innerHTML = `
      <div role="dialog">
        <div>
          <div>
            <div>Palindrome</div>
            <div>
              <div class="markdown-content_markdown__test">
                <p>An integer is a <strong>palindrome</strong> when it reads the same forward and backward.</p>
                <p>For example, <code>121</code> is a palindrome while <code>123</code> is not.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  });

  await expect(page.getByRole("dialog")).toContainText("팰린드롬");
  await expect(page.getByRole("dialog")).toContainText(
    "정수가 앞뒤로 똑같이 읽히면 팰린드롬입니다.",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "예를 들어 121은 팰린드롬이고 123은 아닙니다.",
  );
  await expect(page.getByRole("dialog")).not.toContainText("__peekle");
  await expect(page.getByRole("dialog")).not.toContainText("§");

  const callsBeforeRestore = backendCalls.length;
  await page.locator("#peekle-problem-translate-button").click();

  await expect(page.locator("#peekle-problem-translate-button")).toHaveText(
    "문제 번역",
  );
  await expect(
    page.locator('[data-track-load="description_content"] p').first(),
  ).toHaveText(
    "Given an integer x, return true if x is a palindrome, and false otherwise.",
  );
  await expect(exampleBlock).toContainText("Explanation:");
  await expect(exampleBlock).not.toContainText("설명:");
  await expect(page.getByRole("dialog")).toContainText("Palindrome");

  expect(backendCalls).toHaveLength(callsBeforeRestore);

  await expect(page.locator("#outside-nav")).toHaveText(
    "This navigation must stay English.",
  );
  await expect(page.locator("#outside-panel")).toHaveText(
    "This sidebar must stay English.",
  );

  const requestedTexts = backendCalls.flatMap((call) => call.texts);
  expect(backendCalls.every((call) => call.token === "test-token")).toBe(true);
  expect(requestedTexts).toHaveLength(5);
  expect(requestedTexts[0]).toContain("Given an integer §0§");
  expect(requestedTexts[1]).toContain(
    "121 reads as 121 from left to right and from right to left.",
  );
  expect(requestedTexts).toContain("Palindrome");
  expect(requestedTexts).toContain(
    "An integer is a palindrome when it reads the same forward and backward.",
  );
  expect(requestedTexts).toContain(
    "For example, §0§ is a palindrome while §1§ is not.",
  );
  expect(requestedTexts.join("\n")).not.toContain("Input:");
  expect(requestedTexts.join("\n")).not.toContain("Output:");
  expect(requestedTexts.join("\n")).not.toContain(
    "This navigation must stay English.",
  );
  expect(requestedTexts.join("\n")).not.toContain(
    "This sidebar must stay English.",
  );
});

test("applies cached problem translation immediately without backend request", async ({
  page,
}) => {
  let backendCallCount = 0;

  await page.addInitScript(
    ({ cacheKey }) => {
      const paragraphSource =
        "Given an integer §0§, return §1§ if §2§ is a §3§, and §4§ otherwise.";
      const explanationSource =
        "121 reads as 121 from left to right and from right to left.";
      const storageData: Record<string, unknown> = {
        leetcodeKoreanEnabled: true,
        peekle_token: "test-token",
        [cacheKey]: {
          texts: {
            [paragraphSource]: {
              translatedText:
                "정수 §0§가 주어지면 §2§가 §3§이면 §1§를 반환하고, 그렇지 않으면 §4§를 반환합니다.",
              updatedAt: Date.now(),
            },
            [explanationSource]: {
              translatedText:
                "121은 왼쪽에서 오른쪽으로, 오른쪽에서 왼쪽으로 읽어도 121입니다.",
              updatedAt: Date.now(),
            },
          },
        },
      };

      Object.defineProperty(window, "chrome", {
        configurable: true,
        value: {
          runtime: {
            lastError: null,
            sendMessage(
              request: { type?: string },
              callback: (value: Record<string, unknown> | null) => void,
            ) {
              if (request?.type === "CHECK_ENV") {
                callback({ apiUrl: "https://peekle.test" });
                return;
              }
              if (request?.type === "GET_TOKEN") {
                callback({ token: "test-token" });
                return;
              }
              callback(null);
            },
            onMessage: {
              addListener() {},
            },
          },
          storage: {
            local: {
              get(
                _keys: string[],
                callback: (value: Record<string, unknown>) => void,
              ) {
                callback(storageData);
              },
              set(items: Record<string, unknown>, callback?: () => void) {
                Object.assign(storageData, items);
                callback?.();
              },
            },
            onChanged: {
              addListener() {},
            },
          },
        },
      });
    },
    { cacheKey: translationCacheKey },
  );

  await page.route(apiUrl, async (route) => {
    backendCallCount += 1;
    await route.abort();
  });

  await page.route(problemUrl, async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: problemHtml,
    });
  });

  await page.goto(problemUrl);
  await page.addScriptTag({ path: localizerPath });

  await expect(page.locator("#peekle-problem-translate-button")).toHaveText(
    "원문 보기",
  );
  await expect(page.locator("#peekle-problem-translation-status")).toHaveText(
    "로컬 캐시 적용",
  );
  await expect(
    page.locator('[data-track-load="description_content"] p').first(),
  ).toHaveText(
    "정수 x가 주어지면 x가 palindrome이면 true를 반환하고, 그렇지 않으면 false를 반환합니다.",
  );
  await expect(
    page.locator('[data-track-load="description_content"] pre'),
  ).toContainText("설명:");
  expect(backendCallCount).toBe(0);
});

test("translates LeetCode AI analysis section through backend", async ({
  page,
}) => {
  const backendCalls: Array<{ texts: string[]; token: string | undefined }> = [];

  await page.addInitScript(() => {
    const storageData: Record<string, unknown> = {
      leetcodeKoreanEnabled: true,
      peekle_token: "test-token",
    };

    Object.defineProperty(window, "chrome", {
      configurable: true,
      value: {
        runtime: {
          lastError: null,
          sendMessage(
            request: { type?: string },
            callback: (value: Record<string, unknown> | null) => void,
          ) {
            if (request?.type === "CHECK_ENV") {
              callback({ apiUrl: "https://peekle.test" });
              return;
            }
            if (request?.type === "GET_TOKEN") {
              callback({ token: "test-token" });
              return;
            }
            callback(null);
          },
          onMessage: {
            addListener() {},
          },
        },
        storage: {
          local: {
            get(
              _keys: string[],
              callback: (value: Record<string, unknown>) => void,
            ) {
              callback(storageData);
            },
            set(items: Record<string, unknown>, callback?: () => void) {
              Object.assign(storageData, items);
              callback?.();
            },
          },
          onChanged: {
            addListener() {},
          },
        },
      },
    });
  });

  await page.route(apiUrl, async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() || "{}") as { texts: string[] };
    backendCalls.push({
      texts: body.texts,
      token: request.headers()["x-peekle-token"],
    });

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          translations: body.texts.map(translateStub),
        },
      }),
    });
  });

  await page.route(problemUrl, async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: problemHtml.replace("</main>", `${analysisHtml}</main>`),
    });
  });

  await page.goto(problemUrl);
  await page.addScriptTag({ path: localizerPath });

  await expect(page.locator("#peekle-analysis-translate-button")).toBeVisible();
  await page.locator("#peekle-analysis-translate-button").click();

  await expect(page.locator("#peekle-analysis-translate-button")).toHaveText(
    "AI 분석 원문 보기",
  );
  await expect(page.locator("#peekle-analysis-translation-status")).toHaveText(
    "AI 분석 번역 완료",
  );
  await expect(page.locator("#analysis-approach-content")).toContainText(
    "축하합니다! 첫 시도에 통과했습니다. 오늘 컨디션이 아주 좋네요!",
  );
  await expect(page.locator("#analysis-approach-content")).toContainText(
    "숫자를 순회하며 문자열로 변환해 각 자릿수를 추출하고 결과 배열을 다시 구성합니다.",
  );
  await expect(page.locator("#analysis-efficiency-content")).toContainText(
    "이미 최적의 풀이입니다. 추가 변경은 필요하지 않습니다.",
  );
  await expect(page.locator("#analysis-code-style-content")).toContainText(
    "이 코드는 매우 깔끔하며 모든 모범 사례를 잘 따르고 있습니다.",
  );
  await expect(page.locator(".katex")).toContainText("O(N log M)");
  await expect(page.locator("pre code")).toContainText("class Solution {}");

  const callsBeforeRestore = backendCalls.length;
  await page.locator("#peekle-analysis-translate-button").click();

  await expect(page.locator("#peekle-analysis-translate-button")).toHaveText(
    "AI 분석 번역",
  );
  await expect(page.locator("#analysis-approach-content")).toContainText(
    "Congratulations! You passed on your first attempt. You're in great form today!",
  );
  await expect(page.locator("#analysis-efficiency-content")).toContainText(
    "Your solution is already optimal; no further changes are needed.",
  );
  expect(backendCalls).toHaveLength(callsBeforeRestore);

  const requestedTexts = backendCalls.flatMap((call) => call.texts);
  expect(backendCalls.every((call) => call.token === "test-token")).toBe(true);
  expect(requestedTexts).toEqual([
    "Congratulations! You passed on your first attempt. You're in great form today!",
    "Iterating through numbers, converting to strings to extract digits, and reconstructing the result array.",
    "Your solution is already optimal; no further changes are needed.",
    "This code is exceptionally clean and follows all best practices perfectly.",
  ]);
  expect(requestedTexts.join("\n")).not.toContain("O(N log M)");
  expect(requestedTexts.join("\n")).not.toContain("class Solution");
});

test("shows daily translation limit apology from backend", async ({ page }) => {
  const limitMessage =
    "오늘 번역 가능 횟수 10회를 모두 사용했어요. 제작자의 Gemini 토큰 비용 보호를 위해 제한 중입니다. 내일 다시 이용해 주세요. 양해 부탁드립니다.";

  await page.addInitScript(() => {
    const storageData: Record<string, unknown> = {
      leetcodeKoreanEnabled: true,
      peekle_token: "test-token",
    };

    Object.defineProperty(window, "chrome", {
      configurable: true,
      value: {
        runtime: {
          lastError: null,
          sendMessage(
            request: { type?: string },
            callback: (value: Record<string, unknown> | null) => void,
          ) {
            if (request?.type === "CHECK_ENV") {
              callback({ apiUrl: "https://peekle.test" });
              return;
            }
            if (request?.type === "GET_TOKEN") {
              callback({ token: "test-token" });
              return;
            }
            callback(null);
          },
          onMessage: {
            addListener() {},
          },
        },
        storage: {
          local: {
            get(
              _keys: string[],
              callback: (value: Record<string, unknown>) => void,
            ) {
              callback(storageData);
            },
            set(items: Record<string, unknown>, callback?: () => void) {
              Object.assign(storageData, items);
              callback?.();
            },
          },
          onChanged: {
            addListener() {},
          },
        },
      },
    });
  });

  await page.route(apiUrl, async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: {
          code: "TRANSLATION_005",
          message: limitMessage,
        },
      }),
    });
  });

  await page.route(problemUrl, async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: problemHtml,
    });
  });

  await page.goto(problemUrl);
  await page.addScriptTag({ path: localizerPath });
  await page.locator("#peekle-problem-translate-button").click();

  await expect(page.locator("#peekle-problem-translate-button")).toHaveText(
    "문제 번역",
  );
  await expect(page.locator("#peekle-problem-translation-status")).toHaveText(
    limitMessage,
  );
  await expect(
    page.locator('[data-track-load="description_content"] p').first(),
  ).toHaveText(
    "Given an integer x, return true if x is a palindrome, and false otherwise.",
  );
});
