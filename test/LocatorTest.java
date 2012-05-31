import java.util.HashMap;
import java.util.Map;

import org.junit.Test;

import play.Logger;
import play.libs.WS;
import play.libs.WS.HttpResponse;
import play.test.FunctionalTest;
import constants.Constants;

public class LocatorTest extends FunctionalTest {

	private static String URL = "https://archden.herokuapp.com/";
	

	public void deleteLocation() {

		String ws = Constants.WSURL + Constants.VER +"/data/archden/locations/holyghost";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).delete();

		System.out.println(res.getJson());
	}

	@Test
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

	
	public void plotByMassTimesTest() throws Exception {

		String ws = URL +"plotbytime?dayofweek=monday&timeofday=1000&operator=GT";
		
		System.out.println("URL: "+ ws);
		
		HttpResponse res = WS.url(ws).get();
		
		System.out.println(res.getString("UTF-8"));
		
	}
	


}
