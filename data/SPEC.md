# Spec: sinh câu luyện dịch Việt → Anh

Bạn đang giúp sinh dữ liệu cho một trang luyện viết tiếng Anh (dịch câu tiếng Việt sang tiếng Anh).
Nhiệm vụ của bạn: sinh ra đúng **N câu** cho **một chủ đề** được giao, theo đúng schema JSON dưới đây,
và ghi ra một file JSON hợp lệ tại đường dẫn được giao.

## Yêu cầu cốt lõi — đọc kỹ trước khi viết câu nào

1. **Câu phải chân thực, không phải văn phong sách giáo khoa.** Đây là câu người thật sẽ nói/nhắn/viết
   trong đời sống — có cảm xúc, có ngữ cảnh cụ thể, có thể hơi lan man như lời nói thật (nhưng vẫn ngắn
   gọn, không dài dòng). TRÁNH tuyệt đối kiểu câu giáo trình: "Đây là một cuốn sách.", "Hôm nay trời đẹp.",
   "Tôi tên là John.", "Con mèo ở trên bàn." Câu phải có lý do tồn tại — một tình huống, một cảm xúc,
   một quan sát, một lời phàn nàn/khoe/lo lắng/dặn dò thật.
2. **Không lặp lại cấu trúc câu.** Đừng để 5 câu liền đều bắt đầu bằng "Tôi...". Trộn: câu hỏi, câu cảm
   thán nhẹ, câu có mệnh đề phụ, câu bắt đầu bằng trạng ngữ, câu có "nếu", câu có "mặc dù", câu kể
   chuyện người khác, câu nói về chính mình — xen kẽ tự nhiên.
3. **Không trùng ý giữa các câu trong cùng file.** Mỗi câu phải là một tình huống khác nhau.
4. **Độ khó tăng dần theo cấp độ** (xem bảng bên dưới) — nhưng trong mỗi cấp, hãy đa dạng cấu trúc
   ngữ pháp mục tiêu, đừng lặp lại đúng một mẫu ngữ pháp cho toàn bộ các câu cùng cấp.

## Ba cấp độ

- **A2** — câu đơn hoặc ghép ngắn (8–14 từ tiếng Anh), thì hiện tại đơn / quá khứ đơn / hiện tại tiếp
  diễn / "there is/are", từ vựng thông dụng hằng ngày. Không dùng mệnh đề quan hệ hay câu điều kiện.
- **B1** — câu ghép hoặc có một mệnh đề phụ (12–20 từ), dùng liên từ (because, so, although, when,
  after, before, while), thì hiện tại hoàn thành, quá khứ tiếp diễn, "used to", câu điều kiện loại 1,
  cụm động từ (phrasal verbs) thông dụng.
- **B2** — câu phức, nhiều mệnh đề (16–28 từ), điều kiện loại 2/3, câu bị động, mệnh đề quan hệ, "the
  more... the more", đảo ngữ nhẹ, các cấu trúc diễn đạt quan điểm/giả định/hối tiếc, từ vựng trừu tượng
  hơn (nhưng vẫn là văn nói/viết đời thường, không học thuật).

## Schema — mỗi câu là MỘT object trong mảng JSON

```json
{
  "level": "A2",
  "topic": "food",
  "chunks": [
    { "t": "Sáng nay", "en": "this morning" },
    { "t": "tôi không kịp", "en": "I didn't have time to" },
    { "t": "ăn sáng", "en": "have breakfast" },
    { "t": "nên giờ", "en": "so now" },
    { "t": "đói muốn xỉu.", "en": "I'm starving" }
  ],
  "answers": [
    "I didn't have time to have breakfast this morning, so now I'm starving.",
    "I didn't have time for breakfast this morning, so I'm starving now."
  ]
}
```

Quy tắc cho từng trường:

- `"level"`: đúng một trong `"A2" | "B1" | "B2"`.
- `"topic"`: **giữ nguyên đúng khóa được giao** (ví dụ `"food"`), không đổi.
- `"chunks"`: mảng 3–6 object `{t, en}`.
  - Nối tất cả `t` của một câu bằng **một dấu cách** phải ra **đúng** câu tiếng Việt hoàn chỉnh,
    kể cả dấu câu — nghĩa là dấu phẩy/dấu chấm/dấu chấm hỏi phải dính liền vào cuối chunk chứa nó,
    KHÔNG có chunk nào bắt đầu bằng dấu câu.
  - Mỗi chunk là một cụm có nghĩa (cụm danh từ, cụm động từ, mệnh đề ngắn) — không cắt vụn từng từ.
  - `"en"` là gợi ý tiếng Anh ngắn (2–8 từ) cho đúng cụm đó, tự nhiên, đúng là phần tương ứng sẽ xuất
    hiện trong câu đáp án — không phải bản dịch từng từ một cứng nhắc.
  - MỌI chunk đều phải có `"en"` (không để `null`).
- `"answers"`: mảng **đúng 2 chuỗi** — hai cách diễn đạt tiếng Anh tự nhiên, ĐÚNG NGHĨA như nhau nhưng
  **khác nhau thật sự** (khác cấu trúc câu, khác từ vựng, không chỉ đổi 1 từ đồng nghĩa). Câu tiếng Anh
  phải là thứ người bản ngữ thật sự nói/viết — dùng contraction tự nhiên (don't, I'm, it's...) khi phù
  hợp văn nói, viết hoa đầu câu, có dấu câu cuối câu.
- **Không có trường `"id"`** — bạn không cần tự đánh số.

## Quy trình làm việc

1. Đọc kỹ danh sách chủ đề phụ (subtopics) được giao trong lệnh gốc để đảm bảo đa dạng tình huống —
   không cần dùng hết, nhưng đừng chỉ xoay quanh 2–3 chủ đề phụ.
2. Viết ra đúng số lượng theo từng cấp độ được giao (ví dụ A2:134, B1:117, B2:83).
3. Ghi file bằng công cụ Write, có thể ghi thành nhiều lần nếu cần (ví dụ viết từng phần rồi gộp bằng
   script), miễn là **file cuối cùng là một mảng JSON hợp lệ duy nhất**, đúng tổng số câu yêu cầu.
4. **Bắt buộc tự kiểm tra trước khi báo cáo xong**, dùng Bash, ví dụ:
   ```bash
   node -e '
   const fs=require("fs");
   const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
   console.log("count:", d.length);
   const lv={}; d.forEach(x=>lv[x.level]=(lv[x.level]||0)+1);
   console.log("by level:", lv);
   let bad=0;
   d.forEach((x,i)=>{
     const vi = x.chunks.map(c=>c.t).join(" ");
     if(!x.chunks.every(c=>c.en)) bad++;
     if(x.answers.length!==2) bad++;
     if(!["A2","B1","B2"].includes(x.level)) bad++;
   });
   console.log("loi schema:", bad);
   const dup = new Set(); let dupCount=0;
   d.forEach(x=>{ if(dup.has(x.answers[0])) dupCount++; dup.add(x.answers[0]); });
   console.log("cau trung lap (theo answers[0]):", dupCount);
   ' data/raw-<topic>.json
   ```
   Nếu `count` không đúng, `loi schema` khác 0, hoặc có câu trùng lặp — sửa lại trước khi báo cáo hoàn
   thành. Không báo "xong" nếu chưa tự chạy kiểm tra này và thấy sạch.
5. Trong báo cáo cuối, nêu rõ: tổng số câu đã ghi, phân bố theo level, đường dẫn file, và kết quả tự
   kiểm tra ở bước 4.

## Ba câu mẫu để bám sát văn phong (không dùng lại nguyên văn)

```json
{
  "level": "B1",
  "topic": "work",
  "chunks": [
    { "t": "Cuộc họp", "en": "the meeting" },
    { "t": "bị dời sang", "en": "was pushed back to" },
    { "t": "thứ Sáu", "en": "Friday" },
    { "t": "vì sếp phải", "en": "because the boss had to" },
    { "t": "đi công tác", "en": "go on a business trip" },
    { "t": "đột xuất.", "en": "at short notice" }
  ],
  "answers": [
    "The meeting was pushed back to Friday because the boss had to go on an unexpected business trip.",
    "The meeting was moved to Friday because the boss had to go on a business trip at short notice."
  ]
}
```

```json
{
  "level": "B2",
  "topic": "society",
  "chunks": [
    { "t": "Giá nhà", "en": "house prices" },
    { "t": "ở thành phố", "en": "in the city" },
    { "t": "tăng nhanh đến mức", "en": "have risen so fast that" },
    { "t": "người trẻ", "en": "young people" },
    { "t": "gần như không mua nổi.", "en": "can hardly afford one" }
  ],
  "answers": [
    "House prices in the city have risen so fast that young people can hardly afford one.",
    "Housing prices in the city have gone up so fast that young people can barely afford to buy one."
  ]
}
```

```json
{
  "level": "A2",
  "topic": "transport",
  "chunks": [
    { "t": "Tôi mất", "en": "it takes me" },
    { "t": "gần một tiếng", "en": "almost an hour" },
    { "t": "để đi", "en": "to get" },
    { "t": "từ nhà", "en": "from home" },
    { "t": "đến chỗ làm.", "en": "to work" }
  ],
  "answers": [
    "It takes me almost an hour to get from home to work.",
    "It takes me nearly an hour to get from my house to work."
  ]
}
```
