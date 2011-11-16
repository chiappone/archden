import static org.junit.Assert.*;

import java.net.URLEncoder;

import org.junit.Test;

import constants.Constants;
import data.QueryAppender;

import play.Logger;
import play.libs.WS;
import play.libs.WS.HttpResponse;
import play.test.FunctionalTest;

public class LocatorTest extends FunctionalTest {

	private static String URL = "http://localhost:9000/";
	

	public void deleteLocation() {

		String ws = Constants.WSURL + Constants.VER +"/data/archden/locations/holyghost";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).delete();

		System.out.println(res.getJson());
	}

	
	public void getAllLocations() throws Exception {

		String ws = URL + "plotall";
		
		HttpResponse res = WS.url(ws).get();

		Logger.info(res.getString("UTF-8"));
	}
	
	
	public void getLocation() {

		String ws = URL +"plotname?name=Holy Ghost";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).get();

		Logger.info(res.getString("UTF-8"));

	}

	@Test
	public void plotByMassTimesTest() throws Exception {

		String ws = URL +"plotbytime?dayofweek=monday&timeofday=1000&operator=GT";
		
		System.out.println("URL: "+ ws);
		
		HttpResponse res = WS.url(ws).get();
		
		System.out.println(res.getString("UTF-8"));
		
	}

}
