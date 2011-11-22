import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.Test;

import play.libs.WS;
import play.libs.WS.HttpResponse;
import play.test.UnitTest;
import constants.Constants;

public class DataLoad extends UnitTest {

    @Test
    public void loadCsvFile() throws Exception {
        
    	InputStreamReader reader = new InputStreamReader(
    			getClass().getResourceAsStream("parishes.csv"));
    	
    	BufferedReader rb = new BufferedReader(reader);
    	int linenum = 0;
    	String line = "";
    	String[] header = null;
    	
    	while((line = rb.readLine()) != null){
    		if(linenum == 0){
    			header = line.split(",");
    			//System.out.println("HEADER: "+ header.length);
    			linenum++;
    		}else{
    			String[] data = line.split(",");
    			//System.out.println("DATA: "+ data[0] +" "+ data.length);
    			Map<String,Object> params = new HashMap<String,Object>();
    			for(int i=0; i<data.length; i++){
    				if(!data[i].isEmpty()){
    					String dString = data[i].replaceAll(";", ",");
    					params.put(header[i].toLowerCase().trim(), dString);
    				}
    			}
    			analyzeData(params);
    			//sendLocationRequest(params);
    		}
    	}
    	
    }

    private void analyzeData(Map<String,Object> params){
    	
    	for(Entry<String,Object> e : params.entrySet()){
    		String parishid = (String) params.get("number");
    		String hs = e.getKey().trim();
    		hs = hs.replaceAll("\\s+", "");
    		boolean confession = false;
    		if(hs.contains("confessions")){
    			confession = true;
    		}
    		//System.out.println("HS: '"+ hs +"'");
    		if(hs.contains("monday")){
    			hs = confession ? "weekdayconfessions" : "weekday";
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("tuesday")){
    			hs = confession ? "weekdayconfessions" : "weekday";
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("wednesday")){
    			hs = confession ? "weekdayconfessions" : "weekday";
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("thursday")){
    			hs = confession ? "weekdayconfessions" : "weekday";
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("friday")){
    			hs = confession ? "weekdayconfessions" : "weekday";
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("saturday")){
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("saturdayanticipatory")){
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("sunday")){
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("holydays")){
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}else if(hs.contains("holydayanticipated")){
    			sendMasstimeRequest(parishid, hs, (String) e.getValue(), params);
    		}
    	}
    }
    
    private void sendMasstimeRequest(String parishid, String header, String s, 
    		Map<String,Object> allParams){
    	Pattern p = Pattern.compile("(\\d{4})");
    	Matcher m = p.matcher(s);
    	while(m.find()){
    		String tod = m.group(1);
    		String ws = Constants.WSURL +"/data/archden/masstimes/" + 
        			parishid +":"+ header +":"+ tod;
    		System.out.println("Send: "+ ws);
    		Map<String,Object> params = new HashMap<String,Object>();
    		params.put("parishid", parishid);
    		params.put("dayofweek", header);
    		params.put("timeofday", tod);
    		params.putAll(allParams);
    		HttpResponse res = WS.url(ws)
        			.authenticate(Constants.TOKEN, Constants.ACCOUNTID).params(params).post();
        	System.out.println(res.getJson());
    	}
    }
    
    private void sendLocationRequest(Map<String,Object> params){
    	
    	String ws = Constants.WSURL +"/data/archden/locations/"+ params.get("number");
    	System.out.println("REQ: "+ ws);
    	
    	HttpResponse res = WS.url(ws)
    			.authenticate(Constants.TOKEN, Constants.ACCOUNTID).params(params).post();
    	    	
    	System.out.println(res.getJson());
    }
}
