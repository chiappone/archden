import java.net.URLEncoder;
import java.util.Map;

import org.junit.Test;

import play.libs.WS;
import play.libs.WS.HttpResponse;
import play.test.FunctionalTest;
import constants.Constants;
import data.QueryAppender;

public class SetupAppTest extends FunctionalTest {

	private static String CF_MASS = "masstimes2";
	private static String CF_LOC = "locations2";
	
	//@Test
	public void createKeyspace() {

		String ws = Constants.WSURL + "/keyspace/archden";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).post();

		System.out.println(res.getJson());

	}
	
	//@Test
	public void dropCf() {
		String ws = Constants.WSURL + "/columnfamily/archden/locations";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).delete();

		System.out.println(res.getJson());
	}

	@Test
	public void createColumnFam() {

		String ws = Constants.WSURL
				+ "/columnfamily/archden/"+ CF_MASS + "/UTF8TYPE";
		
		System.out.println("URL: "+ ws);

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).post();

		System.out.println(res.getJson());

		ws = Constants.WSURL + "/columnfamily/archden/"+ CF_LOC +"/UTF8TYPE";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());

	}

	@Test
	public void createColIndex() {

		String ws = Constants.WSURL
				+ "/column/archden/"+ CF_MASS +"/timeofday/INTEGERTYPE?isIndex=true";

		HttpResponse res = WS.url(ws)
				.authenticate(Constants.TOKEN, Constants.ACCOUNTID).post();

		System.out.println(res.getJson());

		ws = Constants.WSURL
				+ "/column/archden/"+ CF_MASS +"/dayofweek/UTF8TYPE?isIndex=true";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());
		
		ws = Constants.WSURL
				+ "/column/archden/"+ CF_MASS +"/name/UTF8TYPE?isIndex=true";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());
		
		ws = Constants.WSURL
				+ "/column/archden/"+ CF_MASS +"/index/UTF8TYPE?isIndex=true";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());

		ws = Constants.WSURL
				+ "/column/archden/"+ CF_LOC +"/name/UTF8TYPE?isIndex=true";

		res = WS.url(ws).authenticate(Constants.TOKEN, Constants.ACCOUNTID)
				.post();

		System.out.println(res.getJson());
	}
}