# AG-07C-2 提案書素材セット Ch.03〜04（最重要）

---

## Layer 0：このAGが存在する理由

Ch.03「解決の方向性」とCh.04「具体的な提案」は提案書の核心。
クライアントが「これで進めよう」と決断するスライドがここに集中している。

AG-07C全体で最もmax_tokensを使うべき章であるため独立させた。
max_tokens: 8192 を全てこの2章に使う。

**出力の目標：**
- body_draft：400〜600字（設計根拠を論理的に展開した完成に近い文章）
- catchCopy：3案（角度が明確に違う）
- evidence：★/※付きで5件以上（AG-02-POSITIONの数値を積極的に使う）
- visual_spec：具体的なページ設計・IA・ワイヤーフレーム相当の指示

---

## Layer 1：担当範囲

Ch.03：解決の方向性・設計原則
  スライド数目安：3〜4枚
  使う分析：AG-02-MERGE.siteDesignPrinciples / AG-04-MERGE.designPriorities / AG-07A

Ch.04：具体的な提案（ページ構成・設計）
  スライド数目安：4〜6枚
  使う分析：AG-06 / AG-07A.contentArchitecture / AG-02-POSITION

---

## Layer 2：判断基準

### body_draftの品質基準（400〜600字が必須）

Ch.03のbody_draftの型：
  「なぜこの設計原則が必要か（根拠）→ この原則を採用することでどう変わるか（変化）→ 競合はここを解いていない（差別化）」

Ch.04のbody_draftの型：
  「このページが解くべき問いは何か → 訪問者はどのフェーズでここに来るか → このコンテンツでどう解決するか → 期待される効果」

### visual_specの要求水準（Ch.04は特に高い）

Ch.04では：
  「このページのファーストビューに何を配置するか」まで指示する
  「どこをクリックするとどこに行くか」の導線も指示する
  「スマホでの表示」も言及する

---

## Layer 3：実行タスク

### Task 1：AG-02-MERGEのsiteDesignPrinciplesを確認する

AG-02-MERGEのsiteDesignPrinciplesを読み込む。
各原則をCh.03のスライドに1対1で対応させる設計にする。

### Task 2：AG-07AのcontentArchitectureを確認する

各ページのdesignMission・targetPhase・keyContentを使って
Ch.04の各スライドを設計する。

### Task 3：AG-02-POSITIONの数値を積極的に使う

4軸のスコア・散布図データを以下のように使う：
  Ch.03の根拠として：「現状はデジタル成熟度X点→目標はY点」
  Ch.04の効果として：「この設計で業界内Z位から上位W%へ」

---

## Layer 4：品質基準

✓ body_draftが全スライドで400字以上
✓ Ch.03の各スライドがsiteDesignPrinciplesの各原則に対応している
✓ Ch.04の各スライドがcontentArchitectureのページに対応している
✓ visual_specでCh.04はページ設計の指示レベルで書かれている

---

## Layer 5：出力形式

AG-07C-1と同じ構造。chapterを"ch-03-04"に変更。
JSONのみ。コードフェンス・説明文・前置き不要。

{
  "chapter": "ch-03-04",
  "slides": [ ... ],
  "confidence": "high|medium|low",
  "factBasis": ["使用した根拠"]
}
