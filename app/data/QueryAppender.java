package data;

import java.io.UnsupportedEncodingException;
import java.lang.reflect.Type;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import play.Logger;
import play.libs.WS;
import play.libs.WS.HttpResponse;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import constants.Constants;

public class QueryAppender {

	public Map<String,Map<String,String>> queryByTime(String dayofweek, String timeofday,
			String operator, String name) 
			throws Exception{
		
		if(operator == null){
			operator = "=";
		}else if(operator.equalsIgnoreCase("GT")){
			operator = ">";
		}else if(operator.equalsIgnoreCase("LT")){
			operator = "<";
		}else{
			operator = "=";
		}
		
		String ws = Constants.WSURL + "/cql/archden/masstimes?select=";
    	StringBuilder select = new StringBuilder("select * WHERE "+
    			"'timeofday' "+ operator + " '"+ timeofday +"'");
    	if(!dayofweek.equalsIgnoreCase("any")){
    		select.append(" AND 'dayofweek' = '"+ dayofweek.toLowerCase() +"'"); 
    	}else{
    		select.append(" AND 'index' = 'yes'");
    	}
    	if(name != null && !name.isEmpty()){
    		select.append(" AND 'name' = '" + name +"'");
    	}
    	
    	Logger.info("select: "+ select.toString());
    	
    	String sel = URLEncoder.encode(select.toString(), "UTF-8");
    	
    	Logger.info("URL: "+ ws + sel);
    	
    	HttpResponse res = WS.url(ws + sel)
    			.authenticate(Constants.TOKEN, Constants.ACCOUNTID).get();
		String jsonResp = res.getString("UTF-8");
    	
    	Map<String,Map<String,String>> retMap = new LinkedHashMap<String,Map<String,String>>();
    	Gson gson = new Gson();
		Type mapType = new TypeToken<Map<String, Map<String,String>>>() {}.getType();
		
		Map<String,Map<String,String>> parMap = gson.fromJson(jsonResp, mapType);
		
		Collection<Map<String, String>> vals = parMap.values();
		for(Map<String,String> parishes : vals){
			String pId = parishes.get("parishid");
			retMap.put(pId, parishes);
		}
		
		return retMap;
	}
	
	private Map<String,Map<String,String>> queryByRowkey(String rowKey) 
			throws UnsupportedEncodingException{
		
		String ws = Constants.WSURL +"/cql/archden/locations?select=";
		String sel = URLEncoder.encode("select * WHERE KEY = '"+ rowKey +"'", "UTF-8");
		
		Logger.info("URL: "+ ws + sel);
		
		HttpResponse res = WS.url(ws + sel)
    			.authenticate(Constants.TOKEN, Constants.ACCOUNTID).get();
		
		String jsonResp = res.getString("UTF-8");
		Gson gson = new Gson();

		Type mapType = new TypeToken<Map<String, Map<String,String>>>() {}.getType();
		
		Map<String,Map<String,String>> retMap = gson.fromJson(jsonResp, mapType);
		
		return retMap;
	}
	
}
