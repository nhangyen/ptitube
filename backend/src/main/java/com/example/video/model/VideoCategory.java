package com.example.video.model;

import java.util.HashMap;
import java.util.Map;

/**
 * Video categories for AI recommendation model (feat0-feat3).
 * Feat values: -1 (Unknown/Padding), 0-30 (actual categories).
 */
public enum VideoCategory {
    UNKNOWN(0, "Không xác định"),
    DAILY_LIFE(1, "Đời sống hằng ngày"),
    TALENT(2, "Tài năng / Kỹ năng"),
    HUMOR(3, "Hài hước / Giải trí"),
    BEAUTY(4, "Làm đẹp / Mỹ phẩm"),
    FOOD(5, "Ẩm thực / Nấu ăn"),
    PETS(6, "Thú cưng / Động vật"),
    MUSIC(7, "Âm nhạc / Ca hát"),
    DANCE(8, "Nhảy / Vũ đạo"),
    FASHION(9, "Thời trang / Quần áo"),
    GAMES(10, "Trò chơi / Game"),
    ANIME(11, "Hoạt hình / Anime"),
    KNOWLEDGE(12, "Kiến thức / Giáo dục"),
    ART(13, "Nghệ thuật / Thủ công"),
    SPORTS(14, "Thể thao / Thể hình"),
    TRAVEL(15, "Du lịch / Phong cảnh"),
    TECHNOLOGY(16, "Công nghệ / Đồ chơi"),
    CARS(17, "Ô tô / Phương tiện"),
    NEWS(18, "Tin tức / Phóng sự"),
    PARENTING(19, "Cha mẹ / Trẻ em"),
    RELATIONSHIP(20, "Tình cảm / Tâm sự"),
    PHOTOGRAPHY(21, "Chụp ảnh / Phim"),
    HEALTH(22, "Sức khỏe / Y học"),
    FINANCE(23, "Tài chính / Kinh tế"),
    CULTURE(24, "Văn hóa / Lịch sử"),
    RELIGION(25, "Tôn giáo / Triết học"),
    NATURE(26, "Thiên nhiên / Sinh vật"),
    JOB(27, "Việc làm / Công sở"),
    MILITARY(28, "Quân sự / Quốc phòng"),
    REAL_ESTATE(29, "Bất động sản / Nhà cửa"),
    MOVIES(30, "Phim ảnh / Sân khấu"),
    LIVE_INTERACTION(31, "PK / Livestream tương tác");

    private final int featValue;
    private final String displayName;

    private static final Map<Integer, VideoCategory> BY_FEAT = new HashMap<>();
    private static final Map<String, VideoCategory> BY_KEYWORD = new HashMap<>();

    static {
        for (VideoCategory cat : values()) {
            BY_FEAT.put(cat.featValue, cat);
        }

        // Auto-map keyword_source from CSV to category
        BY_KEYWORD.put("nhà cửa shorts", REAL_ESTATE);
        BY_KEYWORD.put("real estate shorts", REAL_ESTATE);
        BY_KEYWORD.put("công nghệ shorts", TECHNOLOGY);
        BY_KEYWORD.put("tech shorts", TECHNOLOGY);
        BY_KEYWORD.put("philosophy shorts", RELIGION);
        BY_KEYWORD.put("tôn giáo shorts", RELIGION);
        BY_KEYWORD.put("triết học shorts", RELIGION);
        BY_KEYWORD.put("religion shorts", RELIGION);
        BY_KEYWORD.put("anime shorts", ANIME);
        BY_KEYWORD.put("thể thao shorts", SPORTS);
        BY_KEYWORD.put("thể hình shorts", SPORTS);
        BY_KEYWORD.put("sports shorts", SPORTS);
        BY_KEYWORD.put("nhảy shorts", DANCE);
        BY_KEYWORD.put("vũ đạo shorts", DANCE);
        BY_KEYWORD.put("âm nhạc shorts", MUSIC);
        BY_KEYWORD.put("music shorts", MUSIC);
        BY_KEYWORD.put("thời trang shorts", FASHION);
        BY_KEYWORD.put("quần áo shorts", FASHION);
        BY_KEYWORD.put("trò chơi shorts", GAMES);
        BY_KEYWORD.put("game shorts", GAMES);
        BY_KEYWORD.put("ẩm thực shorts", FOOD);
        BY_KEYWORD.put("nấu ăn shorts", FOOD);
        BY_KEYWORD.put("food shorts", FOOD);
        BY_KEYWORD.put("thú cưng shorts", PETS);
        BY_KEYWORD.put("động vật shorts", PETS);
        BY_KEYWORD.put("pets shorts", PETS);
        BY_KEYWORD.put("làm đẹp shorts", BEAUTY);
        BY_KEYWORD.put("mỹ phẩm shorts", BEAUTY);
        BY_KEYWORD.put("beauty shorts", BEAUTY);
        BY_KEYWORD.put("hài hước shorts", HUMOR);
        BY_KEYWORD.put("giải trí shorts", HUMOR);
        BY_KEYWORD.put("humor shorts", HUMOR);
        BY_KEYWORD.put("tài năng shorts", TALENT);
        BY_KEYWORD.put("talent shorts", TALENT);
        BY_KEYWORD.put("kiến thức shorts", KNOWLEDGE);
        BY_KEYWORD.put("giáo dục shorts", KNOWLEDGE);
        BY_KEYWORD.put("knowledge shorts", KNOWLEDGE);
        BY_KEYWORD.put("nghệ thuật shorts", ART);
        BY_KEYWORD.put("thủ công shorts", ART);
        BY_KEYWORD.put("art shorts", ART);
        BY_KEYWORD.put("du lịch shorts", TRAVEL);
        BY_KEYWORD.put("phong cảnh shorts", TRAVEL);
        BY_KEYWORD.put("travel shorts", TRAVEL);
        BY_KEYWORD.put("scenery shorts", TRAVEL);
        BY_KEYWORD.put("ô tô shorts", CARS);
        BY_KEYWORD.put("phương tiện shorts", CARS);
        BY_KEYWORD.put("cars shorts", CARS);
        BY_KEYWORD.put("tin tức shorts", NEWS);
        BY_KEYWORD.put("phóng sự shorts", NEWS);
        BY_KEYWORD.put("news shorts", NEWS);
        BY_KEYWORD.put("reportage shorts", NEWS);
        BY_KEYWORD.put("cha mẹ shorts", PARENTING);
        BY_KEYWORD.put("trẻ em shorts", PARENTING);
        BY_KEYWORD.put("parenting shorts", PARENTING);
        BY_KEYWORD.put("tình cảm shorts", RELATIONSHIP);
        BY_KEYWORD.put("tâm sự shorts", RELATIONSHIP);
        BY_KEYWORD.put("relationship shorts", RELATIONSHIP);
        BY_KEYWORD.put("chụp ảnh shorts", PHOTOGRAPHY);
        BY_KEYWORD.put("photography shorts", PHOTOGRAPHY);
        BY_KEYWORD.put("quay phim shorts", PHOTOGRAPHY);
        BY_KEYWORD.put("phim ảnh shorts", MOVIES);
        BY_KEYWORD.put("sân khấu shorts", MOVIES);
        BY_KEYWORD.put("movie shorts", MOVIES);
        BY_KEYWORD.put("theater shorts", MOVIES);
        BY_KEYWORD.put("sức khỏe shorts", HEALTH);
        BY_KEYWORD.put("y học shorts", HEALTH);
        BY_KEYWORD.put("medical shorts", HEALTH);
        BY_KEYWORD.put("tài chính shorts", FINANCE);
        BY_KEYWORD.put("finance shorts", FINANCE);
        BY_KEYWORD.put("văn hóa shorts", CULTURE);
        BY_KEYWORD.put("lịch sử shorts", CULTURE);
        BY_KEYWORD.put("culture shorts", CULTURE);
        BY_KEYWORD.put("thiên nhiên shorts", NATURE);
        BY_KEYWORD.put("sinh vật shorts", NATURE);
        BY_KEYWORD.put("nature shorts", NATURE);
        BY_KEYWORD.put("việc làm shorts", JOB);
        BY_KEYWORD.put("office shorts", JOB);
        BY_KEYWORD.put("jobs shorts", JOB);
        BY_KEYWORD.put("quân sự shorts", MILITARY);
        BY_KEYWORD.put("quốc phòng shorts", MILITARY);
        BY_KEYWORD.put("military shorts", MILITARY);
        BY_KEYWORD.put("pk livestream shorts", LIVE_INTERACTION);
        BY_KEYWORD.put("tương tác shorts", LIVE_INTERACTION);
        BY_KEYWORD.put("đời sống shorts", DAILY_LIFE);
        BY_KEYWORD.put("daily life shorts", DAILY_LIFE);
    }

    VideoCategory(int featValue, String displayName) {
        this.featValue = featValue;
        this.displayName = displayName;
    }

    public int getFeatValue() {
        return featValue;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static VideoCategory fromFeatValue(int featValue) {
        return BY_FEAT.getOrDefault(featValue, UNKNOWN);
    }

    public static VideoCategory fromKeywordSource(String keywordSource) {
        if (keywordSource == null || keywordSource.isBlank()) {
            return UNKNOWN;
        }
        return BY_KEYWORD.getOrDefault(keywordSource.trim().toLowerCase(), UNKNOWN);
    }
}
