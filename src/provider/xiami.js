/* eslint-disable no-unused-vars */
/* global parseInt */
/* eslint-disable no-param-reassign */
import { MD5 } from "../crypto/crypto";
import { getParameterByName } from "../utils";

function build_xiami() {
  function caesar(location) {
    const num = location[0];
    const avg_len = Math.floor(location.slice(1).length / num);
    const remainder = location.slice(1).length % num;

    const result = [];
    for (let i = 0; i < remainder; i += 1) {
      const line = location.slice(i * (avg_len + 1) + 1, (i + 1) * (avg_len + 1) + 1);
      result.push(line);
    }

    for (let i = 0; i < num - remainder; i += 1) {
      const line = location.slice((avg_len + 1) * remainder)
        .slice(i * avg_len + 1, (i + 1) * avg_len + 1);
      result.push(line);
    }

    const s = [];
    for (let i = 0; i < avg_len; i += 1) {
      for (let j = 0; j < num; j += 1) {
        s.push(result[j][i]);
      }
    }

    for (let i = 0; i < remainder; i += 1) {
      s.push(result[i].slice(-1));
    }

    return unescape(s.join("")).replace(/\^/g, "0");
  }

  function handleProtocolRelativeUrl(url) {
    const regex = /^.*?\/\//;
    const result = url.replace(regex, "http://");
    return result;
  }

  function xm_retina_url(s) {
    if (s.slice(-6, -4) === "_1") {
      return s.slice(0, -6) + s.slice(-4);
    }
    return s;
  }

  function xm_get_api_url(api, params, token) {
    const params_string = JSON.stringify(params);
    const origin = `${token.split("_")[0]}_xmMain_${api}_${params_string}`;
    const sign = MD5(origin);
    const baseUrl = "https://www.xiami.com";
    return encodeURI(`${baseUrl + api}?_q=${params_string}&_s=${sign}`);
  }

  function xm_api_get(hm, api, params, cookieProvider, callback) {
    const domain = "https://www.xiami.com";
    const name = "xm_sg_tk";
    cookieProvider.getCookie(domain, name, (token) => {
      const url = xm_get_api_url(api, params, token);
      hm({ method: "GET", url, cookieProvider }).then((response) => {
        if (response.data.code === "SG_TOKEN_EMPTY" || response.data.code === "SG_TOKEN_EXPIRED"
            || response.data.code === "SG_INVALID") {
          // token expire, refetch token and start get url
          cookieProvider.getCookie(domain, name, (token2) => {
            const url2 = xm_get_api_url(api, params, token2);
            hm({ method: "GET", url: url2, cookieProvider }).then((res) => {
              callback(res);
            });
          });
        } else {
          callback(response);
        }
      });
    });
  }

  function xm_get_low_quality_img_url(url) {
    return `${url}?x-oss-process=image/resize,m_fill,limit_0,s_330/quality,q_80`;
  }

  function xm_show_playlist(url, hm, pfn, cookieProvider) {
    const offset = getParameterByName("offset", url);
    const page = offset / 30 + 1;
    const pageSize = 60;

    return pfn((resolve, reject) => {
      const api = "/api/list/collect";
      const params = {
        pagingVO: {
          page,
          pageSize,
        },
        dataType: "system",
      };
      xm_api_get(hm, api, params, cookieProvider, (response) => {
        const result = response.data.result.data.collects.map((d) => {
          const default_playlist = {
            cover_img_url: "",
            title: "",
            id: "",
            source_url: "",
          };
          default_playlist.cover_img_url = xm_get_low_quality_img_url(d.collectLogo);
          default_playlist.title = d.collectName;
          const list_id = d.listId;
          default_playlist.id = `xmplaylist_${list_id}`;
          default_playlist.source_url = `http://www.xiami.com/collect/${list_id}`;
          return default_playlist;
        });
        return resolve({
          result,
        });
      });
    });
  }

  // eslint-disable-next-line no-unused-vars
  function xm_bootstrap_track(trackId, hm, pfn) {
    const target_url = `http://www.xiami.com/song/playlist/id/${trackId.slice("xmtrack_".length)
    }/object_name/default/object_id/0/cat/json`;
    return pfn((resolve, reject) => {
      hm({ method: "GET", url: target_url }).then((response) => {
        const { data } = response;
        if (data.data.trackList == null) {
          return reject();
        }
        const { location } = data.data.trackList[0];
        // eslint-disable-next-line
        const url = handleProtocolRelativeUrl(caesar(location));
        const img_url = xm_retina_url(handleProtocolRelativeUrl(data.data.trackList[0].pic));
        const album = data.data.trackList[0].album_name;
        const album_id = `xmalbum_${data.data.trackList[0].album_id}`;
        const lyric_url = handleProtocolRelativeUrl(data.data.trackList[0].lyric_url);
        return resolve({
          url, img_url, album, album_id, lyric_url,
        });
      });
    });
  }

  function xm_convert_song(song_info, artist_field_name) {
    const track = {
      id: `xmtrack_${song_info.song_id}`,
      title: song_info.song_name,
      artist: song_info[artist_field_name],
      artist_id: `xmartist_${song_info.artist_id}`,
      album: song_info.album_name,
      album_id: `xmalbum_${song_info.album_id}`,
      source: "xiami",
      source_url: `http://www.xiami.com/song/${song_info.song_id}`,
      img_url: song_info.album_logo,
      url: `xmtrack_${song_info.song_id}`,
      lyric_url: song_info.lyric_file,
    };
    return track;
  }

  function xm_convert_song2(song_info, artist_field_name) { // eslint-disable-line no-unused-vars
    const track = {
      id: `xmtrack_${song_info.songId}`,
      title: song_info.songName,
      artist: song_info.artistName,
      artist_id: `xmartist_${song_info.artistId}`,
      album: song_info.albumName,
      album_id: `xmalbum_${song_info.albumId}`,
      source: "xiami",
      source_url: `http://www.xiami.com/song/${song_info.songId}`,
      img_url: song_info.albumLogo,
      url: `xmtrack_${song_info.songId}`,
      // 'lyric_url': song_info.lyricInfo.lyricFile
    };
    if (song_info.lyricInfo) {
      track.lyric_url = song_info.lyricInfo.lyricFile;
    }
    return track;
  }

  function xm_get_playlist(url, hm, pfn, cookieProvider) { // eslint-disable-line no-unused-vars
    const list_id = getParameterByName("list_id", url).split("_").pop();

    return pfn((resolve, reject) => {
      const api = "/api/collect/initialize";
      const params = {
        listId: parseInt(list_id, 10),
      };
      xm_api_get(hm, api, params, cookieProvider, (response) => {
        const collect = response.data.result.data.collectDetail;
        const info = {
          cover_img_url: xm_get_low_quality_img_url(collect.collectLogo),
          title: collect.collectName,
          id: `xmplaylist_${list_id}`,
          source_url: `http://www.xiami.com/collect/${list_id}`,
        };
        const tracks = response.data.result.data.collectSongs.map(item => xm_convert_song2(item, "artist_name"));
        return resolve({
          tracks,
          info,
        });
      });
    });
  }

  function xm_search(url, hm, pfn, cookieProvider) { // eslint-disable-line no-unused-vars
    return pfn((resolve, reject) => {
      const api = "/api/search/searchSongs";
      const keyword = getParameterByName("keywords", url);
      const curpage = getParameterByName("curpage", url);
      const pageSize = 60;
      const params = {
        pagingVO: {
          page: curpage,
          pageSize,
        },
        key: keyword,
      };
      xm_api_get(hm, api, params, cookieProvider, (response) => {
        const tracks = response.data.result.data.songs.map(item => xm_convert_song2(item, "artistName"));
        return resolve({
          result: tracks,
          total: response.data.result.data.pagingVO.pages,
        });
      });
    });
  }

  function xm_album(url, hm, pfn, cookieProvider) { // eslint-disable-line no-unused-vars
    return pfn((resolve, reject) => {
      const album_id = getParameterByName("list_id", url).split("_").pop();
      const target_url = `http://api.xiami.com/web?v=2.0&app_key=1&id=${album_id
      }&page=1&limit=20&callback=jsonp217&r=album/detail`;
      hm({
        url: target_url,
        method: "GET",
        transformResponse: false,
      })
        .then((response) => {
          let { data } = response;
          data = data.slice("jsonp217(".length, -")".length);
          data = JSON.parse(data);

          const info = {
            cover_img_url: data.data.album_logo,
            title: data.data.album_name,
            id: `xmalbum_${data.data.album_id}`,
            source_url: `http://www.xiami.com/album/${data.data.album_id}`,
          };

          const tracks = data.data.songs.map(item => xm_convert_song(item, "singers"));
          return resolve({
            tracks,
            info,
          });
        });
    });
  }

  function xm_artist(url, hm, pfn, cookieProvider) { // eslint-disable-line no-unused-vars
    return pfn((resolve, reject) => {
      const artist_id = getParameterByName("list_id", url).split("_").pop();

      let target_url = `http://api.xiami.com/web?v=2.0&app_key=1&id=${artist_id
      }&page=1&limit=20&_ksTS=1459931285956_216`
            + "&callback=jsonp217&r=artist/detail";

      hm({
        url: target_url,
        method: "GET",
        transformResponse: false,
      })
        .then((response) => {
          let { data } = response;
          data = data.slice("jsonp217(".length, -")".length);
          data = JSON.parse(data);

          const info = {
            cover_img_url: xm_retina_url(data.data.logo),
            title: data.data.artist_name,
            id: `xmartist_${artist_id}`,
            source_url: `http://www.xiami.com/artist/${artist_id}`,
          };

          target_url = `http://api.xiami.com/web?v=2.0&app_key=1&id=${artist_id
          }&page=1&limit=20&callback=jsonp217&r=artist/hot-songs`;
          hm({
            url: target_url,
            method: "GET",
            transformResponse: false,
          })
            .then((res) => {
              let { data: res_data } = res;
              res_data = res_data.slice("jsonp217(".length, -")".length);
              res_data = JSON.parse(res_data);

              const tracks = res_data.data.map((item) => {
                const track = xm_convert_song(item, "singers");
                track.artist_id = `xmartist_${artist_id}`;
                return track;
              });
              return resolve({
                tracks,
                info,
              });
            });
        });
    });
  }

  function xm_lyric(url, hm, pfn, cookieProvider) { // eslint-disable-line no-unused-vars
    // const track_id = getParameterByName('track_id', url).split('_').pop();
    const lyric_url = getParameterByName("lyric_url", url);
    return pfn((resolve, reject) => {
      hm({
        url: lyric_url,
        method: "GET",
        transformResponse: false,
      }).then((response) => {
        const { data } = response;
        return resolve({
          lyric: data,
        });
      });
    });
  }

  function xm_parse_url(url) {
    let result;
    const match = /\/\/www.xiami.com\/collect\/([0-9]+)/.exec(url);
    if (match != null) {
      const playlist_id = match[1];
      result = {
        type: "playlist",
        id: `xmplaylist_${playlist_id}`,
      };
    }
    return result;
  }

  function get_playlist(url, hm, pfn, cookieProvider) {
    const list_id = getParameterByName("list_id", url).split("_")[0];
    switch (list_id) {
    case "xmplaylist":
      return xm_get_playlist(url, hm, pfn, cookieProvider);
    case "xmalbum":
      return xm_album(url, hm, pfn, cookieProvider);
    case "xmartist":
      return xm_artist(url, hm, pfn, cookieProvider);
    default:
      return null;
    }
  }
  return {
    showPlaylist: xm_show_playlist,
    getPlaylist: get_playlist,
    parseUrl: xm_parse_url,
    bootstrapTrack: xm_bootstrap_track,
    search: xm_search,
    lyric: xm_lyric,
  };
}

export default build_xiami(); // eslint-disable-line no-unused-vars
